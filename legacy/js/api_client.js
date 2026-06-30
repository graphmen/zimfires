/**
 * ZimFireWatch API Client
 * Facilitates communication with the FastAPI PostGIS Backend.
 */

const API_HOSTNAME = window.location.hostname;
const API_BASE_URL = (API_HOSTNAME === 'localhost' || API_HOSTNAME === '127.0.0.1' || API_HOSTNAME.includes('192.168.') || API_HOSTNAME.includes('10.'))
    ? `http://${API_HOSTNAME}:8000/api/v1`
    : `https://api.zimfirewatch.gov.zw/api/v1`;

console.log(`🌐 ZimFireWatch API Target: ${API_BASE_URL}`);

/**
 * MOCK DATA GENERATOR
 * Used when the backend is offline to keep the UI functional for demo/verification.
 */
const MockData = {
    getFires(count = 45) {
        const features = [];
        const provinces = ['Manicaland', 'Mashonaland East', 'Mashonaland West', 'Matabeleland North', 'Matabeleland South', 'Midlands', 'Masvingo'];
        const parks = ['Hwange National Park', 'Mana Pools', 'Gonarezhou', 'Nyanga', 'Matobo'];
        
        for (let i = 0; i < count; i++) {
            const lon = 25 + Math.random() * 8; // Zimbabwe Lon range
            const lat = -22 + Math.random() * 6; // Zimbabwe Lat range
            const frp = 10 + Math.random() * 400;
            const confidence = Math.random() > 0.7 ? 'high' : (Math.random() > 0.4 ? 'nominal' : 'low');
            
            features.push({
                type: 'Feature',
                id: `mock-${i}`,
                geometry: { type: 'Point', coordinates: [lon, lat] },
                properties: {
                    observation_time: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                    sensor: Math.random() > 0.5 ? 'VIIRS_SNPP' : 'MODIS_AQUA',
                    confidence: confidence,
                    frp: parseFloat(frp.toFixed(1)),
                    near_park: Math.random() > 0.8 ? parks[Math.floor(Math.random() * parks.length)] : 'none',
                    province: provinces[Math.floor(Math.random() * provinces.length)]
                }
            });
        }
        return { type: 'FeatureCollection', features, metadata: { source: 'Mock/Fallback', generated_at: new Date() } };
    },

    getBoundaries(type) {
        // Simplified representative polygons for Zimbabwe provinces/parks
        return { type: 'FeatureCollection', features: [] }; // Leaflet will still work with empty or minimal features
    },

    getTrend() {
        const data = [];
        for (let y = 2001; y <= 2024; y++) {
            data.push({
                year: y,
                count: Math.floor(2000 + Math.random() * 8000),
                total_area_ha: 50000 + Math.random() * 200000
            });
        }
        return data;
    }
};

const APIClient = {
    isMockMode: false,

    async testConnection() {
        try {
            const resp = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`, { signal: AbortSignal.timeout(2000) });
            return resp.ok;
        } catch { return false; }
    },

    async getSystemStatus() {
        try {
            const resp = await fetch(`${API_BASE_URL}/diagnostic/status`, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            this.isMockMode = false;
            return await resp.json();
        } catch (err) {
            this.isMockMode = true;
            return { 
                status: 'demo', 
                message: 'Operating in Offline Demo Mode (Mock Data)',
                error: err.message 
            };
        }
    },

    async getFires(params) {
        try {
            let startDate, endDate, bbox, sensors;
            if (typeof params === 'number') {
                const now = new Date();
                const past = new Date(now.getTime() - params * 3600 * 1000);
                endDate   = now.toISOString().split('T')[0];
                startDate = past.toISOString().split('T')[0];
            } else {
                startDate = params.startDate; endDate = params.endDate;
                bbox = params.bbox; sensors = params.sensors;
            }

            let url = `${API_BASE_URL}/fires?start_date=${startDate}&end_date=${endDate}`;
            if (bbox) url += `&bbox=${bbox}`;
            if (sensors && sensors.length > 0) url += `&sensors=${sensors.join(',')}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) throw new Error(`API Error ${response.status}`);
            return await response.json();
        } catch (err) {
            console.warn('⚠️ API Unreachable, falling back to mock fire data:', err.message);
            this.isMockMode = true;
            return MockData.getFires();
        }
    },

    async getBoundaries(type) {
        try {
            const resp = await fetch(`${API_BASE_URL}/boundaries/${type}`, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (err) {
            console.warn(`⚠️ Boundary layer [${type}] failed, using fallback:`, err.message);
            return MockData.getBoundaries(type);
        }
    },

    async getBurnedAreas(year) {
        try {
            const url = new URL(`${API_BASE_URL}/burned_areas`);
            if (year) url.searchParams.set('year', year);
            const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (err) {
            console.warn('⚠️ Burned area fetch failed, using fallback:', err.message);
            return { type: 'FeatureCollection', features: [] };
        }
    },

    async getHistoricalTrend() {
        try {
            const resp = await fetch(`${API_BASE_URL}/analytics/historical_trend`, { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            return json.data;
        } catch (err) {
            console.warn('⚠️ Historical trend fetch failed, using mock trend:', err.message);
            return MockData.getTrend();
        }
    },

    async triggerIngestSync(dataset, days, adminToken) {
        const url = new URL(`${API_BASE_URL}/ingest/sync`);
        url.searchParams.append('dataset', dataset);
        url.searchParams.append('days', days);
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ingest Trigger Failed (${response.status}): ${errorText}`);
        }
        return response.json();
    }
};

window.APIClient = APIClient;

window.APIClient = APIClient;
