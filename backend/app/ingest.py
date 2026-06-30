import os
import requests
import pandas as pd
from io import StringIO
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func
import shapely.geometry
from geoalchemy2.shape import from_shape

from .models import FireObservation, IngestionJob
from .logger import log

class FIRMSClient:
    def __init__(self, map_key: str = None):
        self.map_key = map_key or os.getenv("FIRMS_MAP_KEY", "DEMO_KEY")
        self.base_url_historical = "https://firms.modaps.eosdis.nasa.gov/api/country/csv"
        self.base_url_realtime = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

    def fetch_nrt_zimbabwe(self, dataset: str, days: int) -> pd.DataFrame:
        """
        Fetch Near Real-Time data from FIRMS API for Zimbabwe (ZWE).
        """
        days = max(1, min(10, days))
        bbox = "25.2,-22.4,33.1,-15.6"
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{self.map_key}/{dataset}/{bbox}/{days}"
        
        log.info(f"FIRMS API Request: {dataset} for {days} days")
        
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            # Parse CSV to pandas dataframe
            df = pd.read_csv(StringIO(response.text))
            log.info(f"FIRMS API Success: Received {len(df)} records")
            return df
        except requests.exceptions.RequestException as e:
            log.error(f"FIRMS API Connection Failed: {e}")
            return pd.DataFrame()

async def upsert_fire_observations(db: AsyncSession, df: pd.DataFrame, dataset_name: str, source_type: str = 'historical', job_id: str = None):
    """
    Idempotent upsert of fire observations from a dataframe.
    """
    records_added = 0
    records_updated = 0
    
    if df.empty:
        return {"processed": 0}

    # Track start of operation
    t0 = datetime.utcnow()
    
    try:
        # Process in batches to avoid overwhelming the async connection
        batch_size = 500
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            
            for _, row in batch.iterrows():
                try:
                    # Construct observation time
                    acq_date = str(row.get('acq_date', ''))
                    acq_time = str(row.get('acq_time', ''))
                    
                    if len(acq_time) <= 4 and acq_time.isdigit():
                        acq_time = acq_time.zfill(4)
                        acq_time = f"{acq_time[:2]}:{acq_time[2:]}:00"
                        
                    obs_dt_str = f"{acq_date}T{acq_time}+00:00"
                    try:
                        observation_time = datetime.fromisoformat(obs_dt_str)
                    except ValueError:
                        observation_time = datetime.utcnow()
                        
                    lat = row.get('latitude')
                    lon = row.get('longitude')
                    sensor = row.get('instrument', row.get('satellite', 'UNKNOWN'))
                    firms_id = f"{sensor}_{acq_date}_{acq_time}_{lat}_{lon}"
                    
                    point = shapely.geometry.Point(lon, lat)
                    geom_wkb = from_shape(point, srid=4326)
                    
                    stmt = insert(FireObservation).values(
                        firms_id=firms_id,
                        observation_time=observation_time,
                        geom=geom_wkb,
                        sensor=sensor,
                        dataset=dataset_name,
                        source_type=source_type,
                        brightness=float(row.get('brightness', row.get('bright_ti4', 0))),
                        confidence=str(row.get('confidence', 'nominal')),
                        frp=float(row.get('frp', 0)) if pd.notna(row.get('frp')) else None,
                        acquisition_date=datetime.strptime(acq_date, "%Y-%m-%d").date() if acq_date else None,
                        country_code="ZW"
                    )
                    
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['firms_id'],
                        set_={
                            'confidence': stmt.excluded.confidence,
                            'brightness': stmt.excluded.brightness,
                            'frp': stmt.excluded.frp,
                            'ingestion_time': func.now()
                        },
                        where=(FireObservation.confidence != stmt.excluded.confidence)
                    )
                    
                    await db.execute(stmt)
                    records_added += 1
                except Exception as inner_e:
                    log.warning(f"Failed to process individual row: {inner_e}")
                    continue
                
            await db.commit()
            processed_so_far = min(i+batch_size, len(df))
            log.info(f"Upsert Batch: Processed {processed_so_far}/{len(df)} records")
            
            if job_id:
                try:
                    await db.execute(
                        insert(IngestionJob).values(id=job_id, records_processed=processed_so_far)
                        .on_conflict_do_update(
                            index_elements=['id'],
                            set_={'records_processed': processed_so_far, 'updated_at': func.now()}
                        )
                    )
                    await db.commit()
                except Exception as job_err:
                    log.warning(f"Failed to update job status: {job_err}")
            
        duration = (datetime.utcnow() - t0).total_seconds()
        log.info(f"Ingestion Finished: {records_added} records in {duration}s")
        return {"processed": records_added}
        
    except Exception as e:
        log.error(f"Upsert Operation Failed: {e}")
        await db.rollback()
        return {"processed": records_added, "error": str(e)}
