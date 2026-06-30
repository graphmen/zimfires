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
engine = create_async_engine(DB_URL, connect_args={"statement_cache_size": 0})
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def load_boundary(session, file_path, layer_type, name_prop):
    print(f"Loading {file_path.name} as {layer_type}...")
    if not file_path.exists():
        print(f"File {file_path} not found, skipping.")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    for feature in data.get("features", []):
        properties = feature.get("properties", {})
        geometry = feature.get("geometry")
        
        if not geometry:
            continue

        # Extract name
        name = properties.get(name_prop)
        if layer_type == "ward":
             name = f"Ward {properties.get('wardnumber')} - {properties.get('district')}"
        elif layer_type == "park":
             name = properties.get("NAME_ENG") or properties.get("NAME") or "Unknown Park"
        
        if not name:
            name = "Unknown"

        geom_json = json.dumps(geometry)
        record_id = str(uuid.uuid4())

        # Use ST_Multi to ensure everything is a multipolygon
        sql = text("""
            INSERT INTO aoi_boundaries (id, name, geom, country_code, layer_type, metadata)
            VALUES (:id, :name, ST_Multi(ST_GeomFromGeoJSON(:geom)), 'ZW', :layer_type, :metadata)
        """)
        
        await session.execute(sql, {
            "id": record_id,
            "name": name,
            "geom": geom_json,
            "layer_type": layer_type,
            "metadata": json.dumps(properties)
        })
        count += 1
        if count % 100 == 0:
            print(f"Processed {count} {layer_type} features...")

    print(f"Finished loading {count} {layer_type} features.")

async def main():
    data_dir = Path(__file__).parent.parent / "data"
    print(f"Starting boundary load from {data_dir}...")
    
    try:
        async with AsyncSessionLocal() as session:
            # 1. Clear existing generic data
            print("Cleaning up old placeholder data...")
            await session.execute(text("DELETE FROM aoi_boundaries WHERE name = 'Unknown AOI'"))
            await session.commit()
            
            # 2. Load layers
            await load_boundary(session, data_dir / "Provincial.geojson", "province", "province_n")
            await load_boundary(session, data_dir / "District.geojson", "district", "district_n")
            await load_boundary(session, data_dir / "pparks.geojson", "park", "NAME")
            await load_boundary(session, data_dir / "Wards.geojson", "ward", "wardnumber")
            
            await session.commit()
            print("All boundaries committed to database successfully!")
    except Exception as e:
        print(f"ERROR during load: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Script started...")
    asyncio.run(main())
