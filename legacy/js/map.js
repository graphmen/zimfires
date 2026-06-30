/**
 * map.js — Leaflet map initialisation, layer management, rendering
 */

const BASE_LAYERS = {
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18
  }),
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri — Esri, i-cubed, USDA, USGS',
    maxZoom: 17
  })
};

// ── Primary Map ────────────────────────────────────────────────
const map = L.map('map', {
  center: [-19.0, 29.8],
  zoom: 6,
  zoomControl: true,
  layers: [BASE_LAYERS.satellite]
});

// ── Primary Layer groups ────────────────────────────────────────
const fireLayer           = L.layerGroup().addTo(map);
const burnedLayer         = L.layerGroup().addTo(map);
const adminLayer          = L.layerGroup().addTo(map);
const districtsLayer      = L.layerGroup();
const wardsLayer          = L.layerGroup();
const parksLayer          = L.layerGroup().addTo(map);
const historicalBurntLayer= L.layerGroup().addTo(map);
const historicalFiresLayer= L.layerGroup().addTo(map);

const canvasRenderer = L.canvas({ padding: 0.5 });

// ── Basemap switcher ──────────────────────────────────────────
function switchBasemap(name) {
  Object.values(BASE_LAYERS).forEach(l => { if (map.hasLayer(l)) map.removeLayer(l); });
  BASE_LAYERS[name].addTo(map);
  BASE_LAYERS[name].bringToBack();
  document.querySelectorAll('.basemap-btn').forEach(b => b.classList.toggle('active', b.dataset.base === name));
}
document.querySelectorAll('.basemap-btn').forEach(btn => {
  btn.addEventListener('click', () => switchBasemap(btn.dataset.base));
});

// ── Boundary Renderers ────────────────────────────────────────
function renderProvinces(geojson) {
  adminLayer.clearLayers();
  L.geoJSON(geojson, {
    style: { color: '#1565C0', weight: 2.0, fillOpacity: 0.03, fillColor: '#1565C0', dashArray: '6, 4' },
    onEachFeature(feature, layer) {
      const p = feature.properties;
      const name = p.province_n ? p.province_n.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ') : 'Unknown';
      layer.bindTooltip(`<b>${name}</b>`, { sticky: true });
    }
  }).addTo(adminLayer);
}

function renderDistricts(geojson) {
  districtsLayer.clearLayers();
  L.geoJSON(geojson, {
    style: { color: '#5C6BC0', weight: 1.0, fillOpacity: 0.0, dashArray: '3, 5' },
    onEachFeature(feature, layer) {
      const p = feature.properties;
      const dname = p.district_n ? p.district_n.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ') : 'Unknown';
      layer.bindTooltip(`<b>${dname} District</b>`, { sticky: true });
    }
  }).addTo(districtsLayer);
}

function renderWards(geojson) {
  wardsLayer.clearLayers();
  L.geoJSON(geojson, {
    renderer: canvasRenderer,
    style: { color: '#9575CD', weight: 0.6, fillOpacity: 0.0, dashArray: '2, 4' },
    onEachFeature(feature, layer) {
      layer.bindTooltip(`<b>Ward ${feature.properties.wardnumber}</b>`, { sticky: true });
    }
  }).addTo(wardsLayer);
}

function renderParks(geojson) {
  parksLayer.clearLayers();
  L.geoJSON(geojson, {
    style: { color: '#2E7D32', weight: 2.2, fillOpacity: 0.10, fillColor: '#2E7D32' },
    onEachFeature(feature, layer) {
      const p = feature.properties;
      layer.bindTooltip(`🌿 <b>${p.NAME_ENG || p.NAME}</b>`, { sticky: true });
    }
  }).addTo(parksLayer);
}

// ── Fire & Burn Area Renderers ───────────────────────────────
function renderFires(features) {
  fireLayer.clearLayers();
  features.forEach(f => {
    const p = f.properties;
    const isHigh = p.confidence === 'high';
    const circle = L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
      radius: isHigh ? 7 : 5,
      color: isHigh ? '#B71C1C' : '#E65100',
      weight: 1.5,
      fillColor: isHigh ? '#D32F2F' : '#F9A825',
      fillOpacity: 0.90
    });
    circle.bindPopup(`
      <div class="fire-popup">
        <h4>🔥 Fire Detection</h4>
        <div class="meta">📅 ${formatDate(p.observation_time)}</div>
        <div class="meta">⚡ FRP: <b>${p.frp || 'N/A'} MW</b></div>
        <div class="meta">🎯 Confidence: ${p.confidence || 'N/A'}</div>
        ${p.near_park !== 'none' ? `<div class="meta">🌿 Park: ${p.near_park}</div>` : ''}
      </div>
    `);
    circle.addTo(fireLayer);
  });
}

function renderHistoricalFires(features) {
  historicalFiresLayer.clearLayers();
  features.forEach(f => {
    const p = f.properties;
    const circle = L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
      radius: 4,
      color: '#6d28d9',
      weight: 1,
      fillColor: '#8b5cf6',
      fillOpacity: 0.7,
      renderer: canvasRenderer
    });
    circle.bindPopup(`
      <div class="fire-popup">
        <h4 style="color:#6d28d9">📜 Archival Record</h4>
        <div class="meta">📅 ${new Date(p.observation_time || p.datetime).toLocaleDateString()}</div>
        <div class="meta">⚡ FRP: <b>${p.frp || 'N/A'} MW</b></div>
      </div>
    `);
    circle.addTo(historicalFiresLayer);
  });
}

function renderBurnedAreas(geojson) {
  burnedLayer.clearLayers();
  const features = geojson.features || geojson;
  L.geoJSON(features, {
    renderer: canvasRenderer,
    style: { color: '#E65100', weight: 1.5, fillColor: '#FF6D00', fillOpacity: 0.3 },
    onEachFeature(feature, layer) {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="fire-popup">
          <h4 style="color:#E65100">🔥 Burn Scar</h4>
          <div class="meta">📍 ${p.province || 'N/A'}</div>
          <div class="meta">📐 Area: <b>${p.area_ha ? p.area_ha.toLocaleString() : 'N/A'} ha</b></div>
        </div>
      `);
    }
  }).addTo(burnedLayer);
}

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  return new Date(isoStr).toLocaleString('en-ZW', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Layer Toggles ────────────────────────────────────────────
function setupLayerToggles() {
  const toggleDefs = [
    { id: 'toggle-fires',  layer: fireLayer },
    { id: 'toggle-burned', layer: burnedLayer },
    { id: 'toggle-parks',  layer: parksLayer },
    { id: 'toggle-wards',  layer: wardsLayer }
  ];
  toggleDefs.forEach(({ id, layer }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => {
      const isOn = el.classList.toggle('on');
      if (isOn) map.addLayer(layer); else map.removeLayer(layer);
    });
  });
}

// ══════════════════════════════════════════════════════════════
//  STATISTICS MAP  (second Leaflet instance on #map-statistics)
// ══════════════════════════════════════════════════════════════
let statsMap           = null;
let statsAdminLayer    = null;
let statsHeatLayer     = null;
let statsClusterLayer  = null;
let statsBurnsLayer    = null;
let statsChoroplethLayer = null;
let statsProvinceGJ    = null;  // cached province GeoJSON for choropleth
let currentStatsMode   = 'cluster'; // 'cluster' | 'heatmap' | 'burns'

function initStatsMap() {
  if (statsMap) return; // already initialised
  statsMap = L.map('map-statistics', {
    center: [-19.0, 29.8],
    zoom: 6,
    zoomControl: true
  });
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri', maxZoom: 17
  }).addTo(statsMap);

  // Province outlines (always visible)
  statsAdminLayer = L.layerGroup().addTo(statsMap);

  statsClusterLayer  = L.layerGroup().addTo(statsMap);
  statsBurnsLayer    = L.layerGroup().addTo(statsMap);
  statsChoroplethLayer = L.layerGroup().addTo(statsMap);

  // Load province boundaries for choropleth
  window.APIClient.getBoundaries('province').then(gj => {
    statsProvinceGJ = gj;
    // Draw basic outlines immediately
    L.geoJSON(gj, {
      style: { color: '#64B5F6', weight: 1.5, fillOpacity: 0.0, dashArray: '5,4' }
    }).addTo(statsAdminLayer);
  });

  setTimeout(() => statsMap.invalidateSize(), 300);
}

/**
 * Render historical fire points on the Stats map using Point Clusters.
 * Uses canvas markers for performance (potentially 50k+ points).
 */
function renderStatsCluster(features) {
  statsClusterLayer.clearLayers();
  if (statsHeatLayer && statsMap.hasLayer(statsHeatLayer)) {
    statsMap.removeLayer(statsHeatLayer);
  }

  const canR = L.canvas({ padding: 0.5 });
  features.forEach(f => {
    const p = f.properties;
    const frp = p.frp || 0;
    // Color by FRP intensity: cool (green-yellow) → hot (deep red)
    const hue = Math.max(0, 120 - Math.min(frp, 400) * 0.3);
    const m = L.circleMarker([f.geometry.coordinates[1], f.geometry.coordinates[0]], {
      radius: frp > 100 ? 5 : 3,
      color: `hsl(${hue},90%,50%)`,
      weight: 0,
      fillColor: `hsl(${hue},90%,50%)`,
      fillOpacity: 0.75,
      renderer: canR
    });
    m.bindPopup(`
      <div class="fire-popup">
        <h4 style="color:#f59e0b">📜 ${new Date(p.observation_time || p.datetime).toLocaleDateString()}</h4>
        <div class="meta">⚡ FRP: <b>${frp} MW</b></div>
        <div class="meta">🎯 Confidence: ${p.confidence || 'N/A'}</div>
      </div>
    `);
    m.addTo(statsClusterLayer);
  });
}

/**
 * Render a heatmap layer from fire points.
 */
function renderStatsHeatmap(features) {
  statsClusterLayer.clearLayers();
  if (statsHeatLayer && statsMap.hasLayer(statsHeatLayer)) {
    statsMap.removeLayer(statsHeatLayer);
  }

  const latLngs = features.map(f => {
    const frp = Math.min(f.properties.frp || 1, 500);
    return [f.geometry.coordinates[1], f.geometry.coordinates[0], frp / 500];
  });

  if (typeof L.heatLayer !== 'undefined') {
    statsHeatLayer = L.heatLayer(latLngs, {
      radius: 18,
      blur: 22,
      maxZoom: 10,
      max: 1.0,
      gradient: { 0: '#1a9850', 0.25: '#fee08b', 0.5: '#f46d43', 0.75: '#d73027', 1: '#a50026' }
    });
    statsHeatLayer.addTo(statsMap);
  } else {
    console.warn('Leaflet.heat plugin not loaded — falling back to clusters');
    renderStatsCluster(features);
  }
}

/**
 * Render burned area polygons on the Stats map with a choropleth by area.
 */
function renderStatsBurns(burnFeatures, fireFeatures) {
  statsClusterLayer.clearLayers();
  if (statsHeatLayer && statsMap.hasLayer(statsHeatLayer)) {
    statsMap.removeLayer(statsHeatLayer);
  }
  statsBurnsLayer.clearLayers();
  statsChoroplethLayer.clearLayers();

  const canR = L.canvas({ padding: 0.5 });

  // Draw burn scars
  L.geoJSON(burnFeatures, {
    renderer: canR,
    style: f => {
      const ha = f.properties.area_ha || 0;
      const opacity = Math.min(0.15 + ha / 500000, 0.75);
      const hue = Math.max(0, 30 - ha / 30000);
      return {
        color: `hsl(${hue},90%,45%)`,
        weight: 0.8,
        fillColor: `hsl(${hue},90%,50%)`,
        fillOpacity: opacity
      };
    },
    onEachFeature(feature, layer) {
      const p = feature.properties;
      layer.bindPopup(`
        <div class="fire-popup">
          <h4 style="color:#E65100">🔥 Burn Scar</h4>
          <div class="meta">📍 ${p.province || 'N/A'}</div>
          <div class="meta">📐 ${p.area_ha ? (p.area_ha / 1000).toFixed(1) + 'k ha' : 'N/A'}</div>
        </div>
      `);
    }
  }).addTo(statsBurnsLayer);
  statsBurnsLayer.addTo(statsMap);

  // Choropleth province fill based on total burned area
  if (statsProvinceGJ) {
    const provTotals = {};
    burnFeatures.forEach(f => {
      const prov = (f.properties.province || 'Unknown').toUpperCase();
      provTotals[prov] = (provTotals[prov] || 0) + (f.properties.area_ha || 0);
    });
    const maxHa = Math.max(...Object.values(provTotals), 1);

    L.geoJSON(statsProvinceGJ, {
      style: feature => {
        const name = (feature.properties.province_n || '').toUpperCase();
        const ha = provTotals[name] || 0;
        const intensity = ha / maxHa;
        const r = Math.round(255 * Math.min(1, intensity * 1.5));
        const g = Math.round(160 * (1 - intensity));
        return {
          fillColor: `rgb(${r},${g},0)`,
          fillOpacity: 0.35,
          color: '#FF6D00',
          weight: 1.5
        };
      },
      onEachFeature(feature, layer) {
        const name = (feature.properties.province_n || '').split(' ')
          .map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
        const ha = provTotals[(feature.properties.province_n || '').toUpperCase()] || 0;
        layer.bindTooltip(
          `<b>${name}</b><br>Burned: ${ha > 0 ? (ha / 1000).toFixed(0) + 'k ha' : 'No data'}`,
          { sticky: true }
        );
      }
    }).addTo(statsChoroplethLayer);
  }
}

/**
 * Master refresh for the Stats map — called by StatisticsModule.
 */
function refreshStatsMap(mode, fireFeatures, burnFeatures) {
  if (!statsMap) initStatsMap();

  // Clear all
  statsClusterLayer.clearLayers();
  statsBurnsLayer.clearLayers();
  statsChoroplethLayer.clearLayers();
  if (statsHeatLayer && statsMap.hasLayer(statsHeatLayer)) {
    statsMap.removeLayer(statsHeatLayer);
  }

  currentStatsMode = mode;

  if (mode === 'cluster') {
    renderStatsCluster(fireFeatures);
  } else if (mode === 'heatmap') {
    renderStatsHeatmap(fireFeatures);
  } else if (mode === 'burns') {
    renderStatsBurns(burnFeatures, fireFeatures);
  }

  statsMap.invalidateSize();
}

// ── Global Export ───────────────────────────────────────────
window.MapModule = {
  map,
  renderFires,
  renderHistoricalFires,
  renderBurnedAreas,
  renderProvinces,
  renderDistricts,
  renderWards,
  renderParks,
  setupLayerToggles,
  // Statistics map
  initStatsMap,
  refreshStatsMap,
  loadHistoricalBurntYear: async (year) => {
    historicalBurntLayer.clearLayers();
    if (!year || year === 'none') return;
    try {
      const gj = await window.APIClient.getBurnedAreas(year);
      L.geoJSON(gj, {
        renderer: canvasRenderer,
        style: { color: '#6d28d9', weight: 1, fillColor: '#8b5cf6', fillOpacity: 0.5 }
      }).addTo(historicalBurntLayer);
    } catch (e) { console.error(e); }
  }
};
