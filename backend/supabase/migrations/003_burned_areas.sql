-- Migration: 003_burned_areas
-- Description: Create table for historical burned area polygons

CREATE TABLE IF NOT EXISTS burned_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geom GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    year INTEGER NOT NULL,
    area_hectares DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for fast ST_Intersects queries
CREATE INDEX IF NOT EXISTS idx_burned_areas_geom ON burned_areas USING GIST (geom);

-- B-Tree index for quick year filtering
CREATE INDEX IF NOT EXISTS idx_burned_areas_year ON burned_areas USING BTREE (year);

-- Enable RLS
ALTER TABLE burned_areas ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access to burned_areas"
    ON burned_areas FOR SELECT
    USING (true);
