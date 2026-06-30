from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from geoalchemy2.functions import ST_Intersects, ST_Contains
from .models import FireObservation, AlertRule, TriggeredAlert, AoiBoundary
from .logger import log
import json
from datetime import datetime, timedelta

async def evaluate_alerts(db: AsyncSession, lookback_minutes: int = 60):
    """
    Evaluates active alert rules against fire observations from the last lookback_minutes.
    """
    log.info(f"Alert Engine: Evaluating rules for the last {lookback_minutes} minutes...")
    
    # 1. Fetch active rules
    rules_query = select(AlertRule).where(AlertRule.is_active == True)
    rules_result = await db.execute(rules_query)
    active_rules = rules_result.scalars().all()
    
    if not active_rules:
        log.info("Alert Engine: No active rules found.")
        return

    # 2. Define lookback window
    since = datetime.utcnow() - timedelta(minutes=lookback_minutes)
    
    alerts_triggered_count = 0
    
    for rule in active_rules:
        try:
            # Build query for observations matching this rule
            query = select(FireObservation).where(
                FireObservation.ingestion_time >= since,
                FireObservation.frp >= (rule.min_frp or 0)
            )
            
            # Confidence Filter
            if rule.min_confidence == 'high':
                query = query.where(FireObservation.confidence == 'high')
            elif rule.min_confidence == 'nominal':
                query = query.where(FireObservation.confidence.in_(['nominal', 'high']))
            
            # Spatial Filter: Park Only
            if rule.park_only:
                # Use a subquery to find if observation is in ANY park
                park_exists_subquery = select(AoiBoundary.id).where(
                    AoiBoundary.layer_type == 'park',
                    ST_Intersects(AoiBoundary.geom, FireObservation.geom)
                ).exists()
                query = query.where(park_exists_subquery)
            
            # Spatial Filter: Province
            if rule.province_filter and rule.province_filter != "All Provinces":
                province_subquery = select(AoiBoundary.id).where(
                    AoiBoundary.layer_type == 'province',
                    AoiBoundary.name == rule.province_filter,
                    ST_Intersects(AoiBoundary.geom, FireObservation.geom)
                ).exists()
                query = query.where(province_subquery)

            # Execute query
            obs_result = await db.execute(query)
            matching_obs = obs_result.scalars().all()
            
            for obs in matching_obs:
                # Check if this specific observation has already triggered this rule
                # (To prevent duplicate alerts if ingestion overlap happens)
                check_query = select(TriggeredAlert).where(
                    TriggeredAlert.rule_id == rule.id,
                    TriggeredAlert.observation_id == obs.id
                )
                check_result = await db.execute(check_query)
                if check_result.scalar():
                    continue
                
                # Trigger Alert
                alert = TriggeredAlert(
                    rule_id=rule.id,
                    observation_id=obs.id,
                    details={
                        "rule_name": rule.name,
                        "severity": rule.severity,
                        "frp": obs.frp,
                        "confidence": obs.confidence,
                        "location": f"{obs.geom}" # Simple representation
                    }
                )
                db.add(alert)
                alerts_triggered_count += 1
                
                # Mock Notification
                log.warning(f"!!! ALERT TRIGGERED !!! Rule: {rule.name} | Severity: {rule.severity.upper()} | FRP: {obs.frp}")
                
            await db.commit()
            
        except Exception as e:
            log.error(f"Alert Engine: Error evaluating rule {rule.name}: {e}")
            await db.rollback()

    log.info(f"Alert Engine: Finished. {alerts_triggered_count} alerts triggered.")
    return alerts_triggered_count
