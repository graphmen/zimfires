import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from .ingest import FIRMSClient, upsert_fire_observations
from .database import AsyncSessionLocal
from .logger import log

scheduler = AsyncIOScheduler()

async def sync_firms_task():
    """
    Background task to sync NASA FIRMS data for Zimbabwe.
    Runs every 6 hours.
    """
    map_key = os.getenv("FIRMS_MAP_KEY")
    if not map_key or map_key == "DEMO_KEY":
        log.warning("Skipping scheduled FIRMS sync: No valid FIRMS_MAP_KEY found in environment.")
        return

    log.info("Starting scheduled NASA FIRMS synchronization...")
    client = FIRMSClient(map_key)
    
    datasets = ["MODIS_C6.1", "VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT"]
    
    async with AsyncSessionLocal() as session:
        for ds in datasets:
            try:
                log.info(f"Syncing dataset: {ds}")
                # Fetch last 24 hours
                fires = client.fetch_nrt_zimbabwe(ds, days=1)
                if fires is not None and not fires.empty:
                    added = await upsert_fire_observations(session, fires, ds, "nrt")
                    log.info(f"Successfully synced {added} new records for {ds}")
                    
                    # Trigger alert evaluation for the last 6 hours
                    from .alerts import evaluate_alerts
                    await evaluate_alerts(session, lookback_minutes=360)
                else:
                    log.info(f"No new records found for {ds}")
            except Exception as e:
                log.error(f"Error syncing {ds} in background: {e}")
        
    log.info("Scheduled FIRMS synchronization complete.")

def start_scheduler():
    if not scheduler.running:
        # Run every 6 hours
        scheduler.add_job(
            sync_firms_task,
            trigger=IntervalTrigger(hours=6),
            id="firms_sync_job",
            name="Sync NASA FIRMS data every 6 hours",
            replace_existing=True
        )
        # Also run once immediately on startup
        scheduler.add_job(sync_firms_task, id="initial_sync_job")
        scheduler.start()
        log.info("APScheduler started: NASA FIRMS backgrounds sync active.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        log.info("APScheduler shut down.")
