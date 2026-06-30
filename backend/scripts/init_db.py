import sys
import os
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import DATABASE_URL

async def apply_schema():
    print(f"Connecting to: {DATABASE_URL}")
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    schema_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
        "supabase", "migrations", "001_initial_schema.sql"
    )
    
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_commands = f.read()

    async with engine.begin() as conn:
        print("Applying 001_initial_schema.sql...")
        # Execute each statement separated by statements
        for cmd in sql_commands.split(";"):
            cmd = cmd.strip()
            if cmd:
                await conn.execute(text(cmd))
                
    print("✅ Schema applied successfully to Supabase.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_schema())
