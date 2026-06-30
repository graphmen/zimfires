import asyncio
import os
import json
import uuid
import sys
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Add backend to path so we can import app modules if needed
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_dir))

# Configure database
DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres.hupqhiyxlghccdabqlrs:thandolwenkosi@aws-1-eu-west-1.pooler.supabase.com:6543/postgres")
# Make sure to disable statement cache for pgbouncer
engine = create_async_engine(DB_URL, connect_args={"statement_cache_size": 0})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def load_geojson_to_db():
    geojson_path = Path(__file__).parent.parent / "data" / "burned_areas.geojson"
    print(f"Loading {geojson_path.name}...")

    with open(geojson_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    async with AsyncSessionLocal() as session:
        count = 0
        for feature in data.get("features", []):
            properties = feature.get("properties", {})
            geometry = feature.get("geometry")
            
            # The properties in burned_areas.geojson usually contain a 'year' or 'date'
            year = properties.get("Year") or properties.get("year") or properties.get("YEAR")
            if not year:
                 # Try to extract from burn_date or date
                 date_val = properties.get("burn_date") or properties.get("date")
                 if date_val and isinstance(date_val, str) and len(date_val) >= 4:
                     year = int(date_val[:4])
                     
            if not year:
                # Default to 2024 if unparsed, but print a warning
                print(f"Warning: Could not parse year for feature. Defaulting to 2024. Properties: {properties}")
                year = 2024
            else:
                year = int(year)
                
            area = properties.get("Area_ha") or properties.get("area_ha") or 0.0

            if not geometry:
                continue

            geom_json = json.dumps(geometry)
            record_id = str(uuid.uuid4())

            # Upsert logic
            sql = text("""
                INSERT INTO burned_areas (id, geom, year, area_hectares)
                VALUES (:id, ST_Multi(ST_GeomFromGeoJSON(:geom)), :year, :area)
            """)
            
            await session.execute(sql, {
                "id": record_id,
                "geom": geom_json,
                "year": year,
                "area": float(area)
            })
            count += 1
            if count % 100 == 0:
                print(f"Processed {count} polygons...")

        await session.commit()
        print(f"Success! Inserted {count} burned area polygons.")

if __name__ == "__main__":
    asyncio.run(load_geojson_to_db())
