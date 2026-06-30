# ZimFireWatch: Frontend API Integration Guide

This document outlines how to replace the static GeoJSON fetching in the dashboard with dynamic, spatial queries against the new FastAPI and PostGIS backend.

## 1. OpenAPI Specification

FastAPI automatically generates the interactive Swagger UI and OpenAPI 3.0 specification.
When the backend is running locally, access it at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **OpenAPI JSON**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

## 2. API Client Stubs (`js/api_client.js`)

A new `APIClient` module has been scaffolded to handle requests to the backend. It abstractly constructs query parameters for Bounding Boxes, Dates, and Sensors.

### Example: Fetching Weekly Detections
Instead of downloading 10MB of `fires.geojson`, the frontend can now query specific date ranges dynamically when the time-slider changes:

```javascript
import { APIClient } from './api_client.js';

// Query all fires in Zimbabwe for August 2025
const firesGeoJSON = await APIClient.getFires({
    startDate: '2025-08-01',
    endDate: '2025-08-31',
    sensors: ['MODIS_TERRA', 'MODIS_AQUA'] // Optional
});

// Render directly to Leaflet
MapModule.renderFires(firesGeoJSON.features);
```

### Example: Triggering FIRMS Ingestion
```javascript
// Triggers the backend to download FIRMS CSV and upsert into PostGIS
const result = await APIClient.triggerIngestSync('MODIS_NRT', '2026-03-20', '2026-03-23');
console.log(`Ingested ${result.records_processed} records.`);
```

## 3. Migration Path for the UI

To fully migrate the `index.html` dashboard:
1. Include `<script src="js/api_client.js"></script>`.
2. In `app.js`, remove the static `Promise.all([fetch('data/fires.geojson'), ...])`.
3. Instead, initialize the dashboard with `await APIClient.getFires({ startDate, endDate })` fetching a 7-day default window.
4. Hook the Filter dropdowns (Confidence, Sensor, Dates) directly into `APIClient.getFires()` and refresh the Leaflet map layer when data returns.
