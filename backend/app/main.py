import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import FastAPI, Depends, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from geoalchemy2.functions import ST_Intersects, ST_SetSRID, ST_MakePoint, ST_AsGeoJSON
from sqlalchemy import func
import json

from .database import get_db, engine, Base, AsyncSessionLocal
from .models import FireObservation, AoiBoundary, BurnedArea, IngestionJob
from .schemas import (
    FireFeatureCollection, FireFeature, PointGeometry, FireFeatureProperties,
    BoundaryCollection, BoundaryFeature,
    BurnedAreaCollection, BurnedAreaFeature,
    HistoricalTrendResponse, HistoricalTrendItem
)
from .ingest import FIRMSClient, upsert_fire_observations
from .alerts import evaluate_alerts
from .auth import verify_admin_token
from .logger import log, time_logger
from .scheduler import start_scheduler, shutdown_scheduler

# Initialize FastAPI App
app = FastAPI(
    title="ZimFireWatch API",
    description="FastAPI Backend for Zimbabwe Fire Information System",
    version="1.0.0"
)

# CORS Middleware (Allow Vercel frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Update to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    log.info("FastAPI Server starting up...")
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    log.info("FastAPI Server shutting down...")
    shutdown_scheduler()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ZimFireWatch API", "timestamp": datetime.utcnow()}

@app.get("/api/v1/diagnostic/status")
@time_logger
async def get_diagnostic_status(db: AsyncSession = Depends(get_db)):
    """Provides a detailed diagnostic report of the system state."""
    try:
        # Check DB connection & recent ingestion jobs
        job_query = select(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(5)
        jobs_result = await db.execute(job_query)
        recent_jobs = jobs_result.scalars().all()
        
        # Check record counts
        fire_count = await db.execute(select(func.count(FireObservation.id)))
        boundary_count = await db.execute(select(func.count(AoiBoundary.id)))
        
        return {
            "status": "operational",
            "database": "connected",
            "counts": {
                "fires": fire_count.scalar(),
                "boundaries": boundary_count.scalar()
            },
            "recent_ingestion_jobs": [
                {
                    "dataset": j.dataset,
                    "status": j.status,
                    "records_processed": j.records_processed,
                    "created_at": j.created_at
                } for j in recent_jobs
            ]
        }
    except Exception as e:
        log.error(f"Diagnostic failure: {e}")
        return {"status": "degraded", "error": str(e)}

@app.get("/api/v1/ingest/jobs")
async def list_ingestion_jobs(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Returns a list of recent ingestion jobs."""
    query = select(IngestionJob).order_by(IngestionJob.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@app.get("/api/v1/fires", response_model=FireFeatureCollection)
@time_logger
async def query_fires(
    start_date: str = Query(..., description="ISO8601 Start Date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="ISO8601 End Date (YYYY-MM-DD)"),
    bbox: str = Query("22.0,-22.5,33.0,-15.5", description="minLon,minLat,maxLon,maxLat (Defaults to Zimbabwe)"),
    sensors: str = Query(None, description="Comma-separated sensors (e.g., MODIS_TERRA,VIIRS_S-NPP)"),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Parse Bounding Box
        try:
            min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid bbox format. Use minLon,minLat,maxLon,maxLat")
            
        # Parse Dates
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO8601 string.")
            
        # Build Query with Spatial Join for Near Park
        # ST_DWithin(deg) 0.045 is approx 5km in Zimbabwe
        park_subquery = select(AoiBoundary.name).where(
            AoiBoundary.layer_type == 'park',
            func.ST_DWithin(AoiBoundary.geom, FireObservation.geom, 0.045)
        ).order_by(func.ST_Distance(AoiBoundary.geom, FireObservation.geom)).limit(1).scalar_subquery()

        query = select(
            FireObservation, 
            func.ST_AsGeoJSON(FireObservation.geom).label('geojson_geom'),
            park_subquery.label('near_park_name')
        ).where(
            FireObservation.observation_time >= start_dt,
            FireObservation.observation_time <= end_dt
        )
        
        if sensors:
            sensor_list = [s.strip() for s in sensors.split(",")]
            query = query.where(FireObservation.sensor.in_(sensor_list))
            
        polygon_wkt = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
        query = query.where(
            ST_Intersects(
                FireObservation.geom,
                func.ST_GeomFromText(polygon_wkt, 4326)
            )
        )
        
        query = query.order_by(FireObservation.observation_time.desc()).limit(1500)
        
        result = await db.execute(query)
        rows = result.all()
        
        features = []
        for row in rows:
            obs = row.FireObservation
            geom_dict = json.loads(row.geojson_geom)
            
            feat = FireFeature(
                id=str(obs.id),
                geometry=PointGeometry(**geom_dict),
                properties=FireFeatureProperties(
                    firms_id=obs.firms_id,
                    observation_time=obs.observation_time,
                    sensor=obs.sensor,
                    brightness=obs.brightness,
                    confidence=obs.confidence,
                    frp=obs.frp,
                    dataset=obs.dataset,
                    source_type=obs.source_type,
                    country_code=obs.country_code,
                    near_park=row.near_park_name or "none"
                )
            )
            features.append(feat)
            
        return FireFeatureCollection(
            features=features,
            metadata={
                "total_records": len(features),
                "clipped_to_zimbabwe": bbox == "22.0,-22.5,33.0,-15.5"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Fault-Tolerant Catch: query_fires failed: {e}")
        # Return empty collection instead of 500 error
        return FireFeatureCollection(features=[], metadata={"error": "Database query failed. Returning partial results."})

@app.get("/api/v1/boundaries/{layer_type}", response_model=BoundaryCollection)
@time_logger
async def get_boundaries(layer_type: str, db: AsyncSession = Depends(get_db)):
    try:
        valid_layers = ["province", "district", "park", "ward"]
        if layer_type not in valid_layers:
            raise HTTPException(status_code=400, detail=f"Invalid layer type. Must be one of {valid_layers}")

        query = select(AoiBoundary, func.ST_AsGeoJSON(AoiBoundary.geom).label('geojson_geom')).where(
            AoiBoundary.layer_type == layer_type
        )
        
        result = await db.execute(query)
        rows = result.all()
        
        features = []
        for row in rows:
            bound = row.AoiBoundary
            features.append(BoundaryFeature(
                id=str(bound.id),
                geometry=json.loads(row.geojson_geom),
                properties=bound.layer_metadata or {"name": bound.name}
            ))
            
        return BoundaryCollection(features=features)
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"Fault-Tolerant Catch: get_boundaries({layer_type}) failed: {e}")
        return BoundaryCollection(features=[])

@app.get("/api/v1/burned_areas", response_model=BurnedAreaCollection)
@time_logger
async def get_burned_areas(year: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    try:
        query = select(BurnedArea, func.ST_AsGeoJSON(func.ST_Simplify(BurnedArea.geom, 0.01)).label('geojson_geom'))
        target_year = year or 2024
        query = query.where(BurnedArea.year == target_year)
        query = query.order_by(BurnedArea.area_hectares.desc()).limit(250)
            
        result = await db.execute(query)
        rows = result.all()
        
        features = []
        for row in rows:
            ba = row.BurnedArea
            features.append(BurnedAreaFeature(
                id=str(ba.id),
                geometry=json.loads(row.geojson_geom),
                properties={
                    "year": ba.year,
                    "area_ha": ba.area_hectares
                }
            ))
            
        return BurnedAreaCollection(features=features)
    except Exception as e:
        log.error(f"Fault-Tolerant Catch: get_burned_areas failed: {e}")
        return BurnedAreaCollection(features=[])

@app.get("/api/v1/analytics/historical_trend", response_model=HistoricalTrendResponse)
@time_logger
async def get_historical_trend(db: AsyncSession = Depends(get_db)):
    try:
        from sqlalchemy import select, func
        query = select(
            BurnedArea.year,
            func.count(BurnedArea.id).label("count"),
            func.sum(BurnedArea.area_hectares).label("total_area_ha")
        ).group_by(BurnedArea.year).order_by(BurnedArea.year)
        
        result = await db.execute(query)
        rows = result.all()
        
        data = [
            HistoricalTrendItem(
                year=row.year,
                count=row.count,
                total_area_ha=row.total_area_ha or 0.0
            ) for row in rows
        ]
        
        return HistoricalTrendResponse(data=data)
    except Exception as e:
        log.error(f"Fault-Tolerant Catch: get_historical_trend failed: {e}")
        return HistoricalTrendResponse(data=[])

# --- Asynchronous Ingestion Logic ---

async def run_ingestion_background(dataset: str, days: int):
    """Background task to fetch and upsert FIRMS data."""
    import uuid
    job_id = str(uuid.uuid4())
    
    async with AsyncSessionLocal() as db:
        try:
            log.info(f"Starting background ingestion job {job_id} for {dataset} ({days} days)")
            
            # Create job record
            job = IngestionJob(
                id=job_id,
                dataset=dataset,
                status="running",
                records_processed=0,
                start_date=datetime.utcnow()
            )
            db.add(job)
            await db.commit()
            
            client = FIRMSClient()
            df = client.fetch_nrt_zimbabwe(dataset, days)
            
            if df.empty:
                log.warning(f"Background Ingest: No data for {dataset}")
                # Use update instead of insert/upsert for existing job record
                await db.execute(
                    select(IngestionJob).where(IngestionJob.id == job_id)
                )
                await db.execute(
                    insert(IngestionJob).values(id=job_id, status="completed", records_processed=0)
                    .on_conflict_do_update(index_elements=['id'], set_={'status': 'completed'})
                )
                await db.commit()
                return

            result = await upsert_fire_observations(db, df, dataset_name=dataset, source_type='real-time', job_id=job_id)
            log.info(f"Background Ingest SUCCESS: {result['processed']} records upserted.")
            
            # Update job as completed
            await db.execute(
                insert(IngestionJob).values(id=job_id, status="completed", records_processed=result['processed'])
                .on_conflict_do_update(index_elements=['id'], set_={'status': 'completed'})
            )
            await db.commit()
            
            # Trigger alert evaluation for recent observations (look back for the range of data fetched)
            await evaluate_alerts(db, lookback_minutes=days * 24 * 60)
            
        except Exception as e:
            log.error(f"Background Ingest CRITICAL FAILURE: {e}")
            try:
                await db.execute(
                    insert(IngestionJob).values(id=job_id, status="failed")
                    .on_conflict_do_update(index_elements=['id'], set_={'status': 'failed'})
                )
                await db.commit()
            except: pass

@app.post("/api/v1/ingest/sync", dependencies=[Depends(verify_admin_token)])
async def trigger_ingest_sync(
    background_tasks: BackgroundTasks,
    dataset: str = Query(..., description="Dataset name e.g., MODIS_NRT, VIIRS_SNPP_NRT"),
    days: int = Query(3, description="Number of days trailing today to fetch (1-10)"),
):
    """Triggers an asynchronous ingestion job and returns immediately."""
    log.info(f"Ingestion requested for {dataset} ({days} days). Dispatching to background.")
    background_tasks.add_task(run_ingestion_background, dataset, days)
    
    return {
        "status": "accepted",
        "message": f"Ingestion job for {dataset} has been dispatched to background tasks.",
        "estimated_days": days,
        "timestamp": datetime.utcnow()
    }
