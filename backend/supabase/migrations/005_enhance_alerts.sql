-- Enhance triggered_alerts table with explicit columns for better reporting
ALTER TABLE triggered_alerts 
DROP CONSTRAINT IF EXISTS triggered_alerts_fire_id_fkey,
ALTER COLUMN fire_id TYPE TEXT,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT,
ADD COLUMN IF NOT EXISTS frp FLOAT,
ADD COLUMN IF NOT EXISTS confidence TEXT,
ADD COLUMN IF NOT EXISTS detected_at TIMESTAMPTZ;

-- Index for detected_at
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_detected_at ON triggered_alerts (detected_at DESC);

