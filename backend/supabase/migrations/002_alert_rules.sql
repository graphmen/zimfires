-- Table for Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'info')),
    province_filter TEXT,
    park_filter TEXT,
    min_frp FLOAT,
    min_confidence TEXT,
    park_only BOOLEAN DEFAULT FALSE,
    channels TEXT[] DEFAULT '{}', -- SMS, Email, Telegram, WhatsApp
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Triggered Alerts (History)
CREATE TABLE IF NOT EXISTS triggered_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
    fire_id UUID REFERENCES fire_observations(id),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);
