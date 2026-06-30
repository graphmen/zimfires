import sys
import os
import json
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
import shapely.geometry
from geoalchemy2.shape import from_shape

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models import AoiBoundary
from app.database import get_db, engine, AsyncSessionLocal

async def load_geojson(filepath: str, name_field: str = "PROVINCE"):
    """
    Reads a GeoJSON file and upserts it into the aoi_boundaries PostGIS table.
    """
    print(f"Loading {filepath}...")
    
    if not os.path.exists(filepath):
        print(f"Error: File not found at {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    async with AsyncSessionLocal() as session:
        count = 0
        for feature in data.get('features', []):
            properties = feature.get('properties', {})
            name = properties.get(name_field, "Unknown AOI")
            
            geom_dict = feature.get('geometry')
            if not geom_dict:
                continue
                
            # Convert GeoJSON dict to Shapely shape
            shape = shapely.geometry.shape(geom_dict)
            
            # Ensure it's a MultiPolygon for the DB schema
            if shape.geom_type == 'Polygon':
                shape = shapely.geometry.MultiPolygon([shape])
            elif shape.geom_type != 'MultiPolygon':
                print(f"Skipping {name}: Unsupported geometry type {shape.geom_type}")
                continue

            # Convert to WKBElement for GeoAlchemy2
            wkb_element = from_shape(shape, srid=4326)

            # Create DB Model
            aoi = AoiBoundary(
                name=name,
                geom=wkb_element,
                country_code="ZW"
            )
            
            session.add(aoi)
            count += 1
            
        await session.commit()
        print(f"✅ Successfully loaded {count} boundaries into PostGIS from {os.path.basename(filepath)}.")

async def main():
    # Adjust path assuming this script is run from backend/scripts/ or backend/
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    data_dir = os.path.join(base_dir, "data")
    
    provinces_file = os.path.join(data_dir, "Provinces.geojson")
    
    print("Starting PostGIS boundary migration...")
    await load_geojson(provinces_file, name_field="PROV_NAME") # Make sure the field matches geojson properties

if __name__ == "__main__":
    asyncio.run(main())
