import asyncio
import json
import pandas as pd
from datetime import datetime
import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.database import AsyncSessionLocal
from app.ingest import upsert_fire_observations

async def load_dummy_fires():
    file_path = os.path.join(base_dir, "..", "data", "fires.geojson")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    records = []
    for feat in data.get("features", []):
        props = feat.get("properties", {})
        coords = feat.get("geometry", {}).get("coordinates", [0, 0])
        
        records.append({
            "latitude": coords[1],
            "longitude": coords[0],
            "acq_date": props.get("datetime", "").split("T")[0],
            "acq_time": props.get("datetime", "").split("T")[1].replace(":", "")[:4],
            "satellite": props.get("satellite", "Unknown"),
            "confidence": props.get("confidence", "nominal"),
            "frp": props.get("frp", 0.0)
        })
        
    df = pd.DataFrame(records)
    print(f"Loaded {len(df)} records from fires.geojson")
    
    async with AsyncSessionLocal() as session:
        result = await upsert_fire_observations(session, df, dataset_name="MODIS_C6.1", source_type="historical")
        print(f"Import complete: {result}")

if __name__ == "__main__":
    asyncio.run(load_dummy_fires())
