-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- Table for Zimbabwe Admin Boundaries
CREATE TABLE IF NOT EXISTS aoi_boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    country_code TEXT DEFAULT 'ZW',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Fire Observations
CREATE TABLE IF NOT EXISTS fire_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geom GEOMETRY(POINT, 4326) NOT NULL,
    observation_time TIMESTAMPTZ NOT NULL,
    ingestion_time TIMESTAMPTZ DEFAULT NOW(),
    sensor TEXT CHECK (sensor IN ('MODIS_TERRA','MODIS_AQUA','VIIRS_S-NPP','VIIRS_NOAA20','VIIRS_NOAA21','LANDSAT_OLI')),
    dataset TEXT CHECK (dataset IN ('MODIS_C6.1','VIIRS_375m','LANDSAT_30m')),
    source_type TEXT CHECK (source_type IN ('historical','real-time','ultra-real-time')),
    firms_id TEXT UNIQUE,
    brightness FLOAT,
    confidence TEXT,
    frp FLOAT,
    acquisition_date DATE,
    country_code TEXT DEFAULT 'ZW',
    metadata JSONB
);

-- Ingestion Jobs tracking
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset TEXT NOT NULL,
    aoi_filter TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('queued','running','completed','failed')),
    records_processed INT DEFAULT 0,
    cursor_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fire_observations_geom ON fire_observations USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_aoi_boundaries_geom ON aoi_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_fire_observations_time ON fire_observations (observation_time DESC);
CREATE INDEX IF NOT EXISTS idx_fire_observations_sensor_time ON fire_observations (sensor, observation_time);
CREATE INDEX IF NOT EXISTS idx_fire_observations_country_time ON fire_observations (country_code, observation_time);
CREATE INDEX IF NOT EXISTS idx_fire_observations_confidence ON fire_observations (confidence);
