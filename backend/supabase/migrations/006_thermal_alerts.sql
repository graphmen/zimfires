-- Migration: 006_thermal_alerts.sql
-- Description: Adds Heatwave and Urban Heat Island (UHI) monitoring support to alert rules.

-- 1. Create Alert Type Enum
DO $$ BEGIN
    CREATE TYPE alert_category AS ENUM ('FIRE', 'UHI', 'HEAT_RISK');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update alert_rules table
ALTER TABLE alert_rules 
ADD COLUMN IF NOT EXISTS alert_type alert_category DEFAULT 'FIRE',
ADD COLUMN IF NOT EXISTS thermal_threshold FLOAT, -- Max temp threshold in Celsius
ADD COLUMN IF NOT EXISTS district_id TEXT; -- Target district for regional alerts

-- 3. Update triggered_alerts table
ALTER TABLE triggered_alerts
ADD COLUMN IF NOT EXISTS alert_value FLOAT; -- The actual value that triggered the alert (e.g. 42.5 C)

-- 4. Insert a default UHI rule for Harare as a template
INSERT INTO alert_rules (name, severity, alert_type, thermal_threshold, district_id, is_active)
VALUES ('Harare Urban Heat Surveillance', 'high', 'UHI', 38.0, 'Harare', true)
ON CONFLICT DO NOTHING;
