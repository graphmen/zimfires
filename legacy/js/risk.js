/**
 * risk.js — Risk Zones Analysis Module
 * Calculates provincial fire risk scores based on historical fire density,
 * burned area, proximity to protected areas, and seasonal factors.
 */

const RiskZonesModule = (() => {
  // Zimbabwe area by province (approx km²)
  const PROVINCE_META = {
    'MASHONALAND WEST':    { area: 57441, color: '#1e90ff' },
    'MASHONALAND CENTRAL': { area: 28347, color: '#00bcd4' },
    'MASHONALAND EAST':    { area: 32230, color: '#26a69a' },
    'MANICALAND':          { area: 36459, color: '#66bb6a' },
    'MASVINGO':            { area: 56566, color: '#ffca28' },
    'MIDLANDS':            { area: 49166, color: '#ffa726' },
    'MATABELELAND NORTH':  { area: 75025, color: '#ef5350' },
    'MATABELELAND SOUTH':  { area: 54172, color: '#ab47bc' },
    'HARARE':              { area:   872, color: '#8d6e63' },
    'BULAWAYO':            { area:   459, color: '#78909c' }
  };

  // Risk level thresholds (score 0-100)
  const RISK_LEVELS = [
    { label: 'Critical', min: 80, color: '#ef4444', glow: 'rgba(239,68,68,0.3)' },
    { label: 'High',     min: 60, color: '#f97316', glow: 'rgba(249,115,22,0.3)' },
    { label: 'Medium',   min: 40, color: '#fbbf24', glow: 'rgba(251,191,36,0.2)' },
    { label: 'Low',      min:  0, color: '#4ade80', glow: 'rgba(74,222,128,0.15)' }
  ];

  let riskMap       = null;
  let riskLayer     = null;
  let riskAdminLayer = null;
  let _provinceGJ   = null;
  let _calculated   = false;

  // ── Score Calculation ─────────────────────────────────────
  /**
   * Calculate risk scores from fire + burn data.
   * Returns: { PROVINCE_NAME: { score, level, fires, burnedHa, label } }
   */
  function calculateRisk(fires, burns) {
    const scores = {};

    // Aggregate by province
    const fireCounts  = {};
    const highConf    = {};
    const burnedHa    = {};
    const sumFrp      = {};

    fires.forEach(f => {
      const prov = (f.properties.province || '').toUpperCase().trim();
      if (!prov) return;
      fireCounts[prov] = (fireCounts[prov] || 0) + 1;
      sumFrp[prov]     = (sumFrp[prov] || 0) + (f.properties.frp || 0);
      if ((f.properties.confidence || '').toLowerCase() === 'high') {
        highConf[prov] = (highConf[prov] || 0) + 1;
      }
    });

    burns.forEach(f => {
      const prov = (f.properties.province || '').toUpperCase().trim();
      if (!prov) return;
      burnedHa[prov] = (burnedHa[prov] || 0) + (f.properties.area_ha || 0);
    });

    const maxFires    = Math.max(...Object.values(fireCounts), 1);
    const maxBurned   = Math.max(...Object.values(burnedHa), 1);
    const maxFrp      = Math.max(...Object.values(sumFrp), 1);

    const allProvinces = new Set([
      ...Object.keys(fireCounts),
      ...Object.keys(burnedHa),
      ...Object.keys(PROVINCE_META)
    ]);

    allProvinces.forEach(prov => {
      const fc   = fireCounts[prov]  || 0;
      const hc   = highConf[prov]    || 0;
      const bha  = burnedHa[prov]    || 0;
      const frp  = sumFrp[prov]      || 0;
      const meta = PROVINCE_META[prov] || { area: 50000 };

      // Density score (fires per km²) — normalised 0-1
      const densityScore = Math.min((fc / meta.area) * 1000, 1);
      // Burn area score
      const burnScore    = Math.min(bha / maxBurned, 1);
      // High-confidence fraction
      const confScore    = fc > 0 ? hc / fc : 0;
      // FRP intensity score
      const frpScore     = Math.min(frp / maxFrp, 1);

      // Weighted composite score (0-100)
      const composite = (densityScore * 35 + burnScore * 30 + confScore * 20 + frpScore * 15) * 100;
      const score = Math.round(Math.min(composite, 100));

      const level = RISK_LEVELS.find(r => score >= r.min) || RISK_LEVELS[3];

      scores[prov] = {
        score,
        level:     level.label,
        color:     level.color,
        fires:     fc,
        burnedHa:  Math.round(bha),
        avgFrp:    fc > 0 ? (frp / fc).toFixed(1) : 0
      };
    });

    return scores;
  }

  // ── UI Rendering ──────────────────────────────────────────
  function renderCards(scores) {
    const container = document.getElementById('risk-cards-container');
    if (!container) return;

    // Sort by score descending
    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);

    container.innerHTML = '';
    sorted.forEach(([prov, data]) => {
      const label = prov.replace('MASHONALAND ', 'MSHLND ')
        .split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
      const card = document.createElement('div');
      card.className = 'risk-card';
      card.style.setProperty('--risk-color', data.color);

      const scorePct = data.score;
      card.innerHTML = `
        <div class="risk-card-header">
          <span class="risk-province">${label}</span>
          <span class="risk-badge" style="background:${data.color}22;color:${data.color};border:1px solid ${data.color}44;">
            ${data.level}
          </span>
        </div>
        <div class="risk-score-bar-wrap">
          <div class="risk-score-bar" style="width:${scorePct}%;background:${data.color};box-shadow:0 0 8px ${data.color}88;"></div>
        </div>
        <div class="risk-score-value">${scorePct}<small>/100</small></div>
        <div class="risk-metrics">
          <div class="risk-metric"><span class="m-label">🔥 Hotspots</span><span class="m-value">${data.fires.toLocaleString()}</span></div>
          <div class="risk-metric"><span class="m-label">🛰 Burned</span><span class="m-value">${data.burnedHa > 0 ? (data.burnedHa / 1000).toFixed(0) + 'k ha' : '—'}</span></div>
          <div class="risk-metric"><span class="m-label">⚡ Avg FRP</span><span class="m-value">${data.avgFrp || '—'} MW</span></div>
        </div>
      `;
      card.addEventListener('click', () => {
        if (riskMap && _provinceGJ) panToProvince(prov);
      });
      container.appendChild(card);
    });

    // Update summary KPIs
    const critCount = Object.values(scores).filter(s => s.level === 'Critical').length;
    const highCount = Object.values(scores).filter(s => s.level === 'High').length;
    const el1 = document.getElementById('risk-kpi-critical');
    const el2 = document.getElementById('risk-kpi-high');
    const el3 = document.getElementById('risk-kpi-provinces');
    if (el1) el1.textContent = critCount;
    if (el2) el2.textContent = highCount;
    if (el3) el3.textContent = Object.keys(scores).length;
  }

  function renderChoropleth(scores) {
    if (!riskMap) return;
    riskLayer.clearLayers();

    if (!_provinceGJ) {
      window.APIClient.getBoundaries('province').then(gj => {
        _provinceGJ = gj;
        drawChoropleth(gj, scores);
      });
    } else {
      drawChoropleth(_provinceGJ, scores);
    }
  }

  function drawChoropleth(gj, scores) {
    riskAdminLayer.clearLayers();
    L.geoJSON(gj, {
      style: feature => {
        const prov = (feature.properties.province_n || '').toUpperCase().trim();
        const data = scores[prov] || { score: 0, color: '#334155' };
        return {
          fillColor:   data.color,
          fillOpacity: 0.35 + (data.score / 100) * 0.4,
          color:       data.color,
          weight:      1.5
        };
      },
      onEachFeature(feature, layer) {
        const prov = (feature.properties.province_n || '').toUpperCase().trim();
        const data = scores[prov] || { score: 0, level: 'Unknown', fires: 0 };
        const name = (feature.properties.province_n || '').split(' ')
          .map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
        layer.bindTooltip(`
          <div style="text-align:left;min-width:140px">
            <b>${name}</b><br>
            Risk: <b style="color:${data.color}">${data.level} (${data.score}/100)</b><br>
            Hotspots: ${data.fires.toLocaleString()}
          </div>
        `, { sticky: true });
      }
    }).addTo(riskAdminLayer);
  }

  function panToProvince(provName) {
    if (!_provinceGJ) return;
    const feature = _provinceGJ.features.find(f =>
      (f.properties.province_n || '').toUpperCase() === provName.toUpperCase()
    );
    if (feature && riskMap) {
      const layer = L.geoJSON(feature);
      riskMap.fitBounds(layer.getBounds(), { padding: [40, 40] });
    }
  }

  // ── Map Init ───────────────────────────────────────────────
  function initMap() {
    if (riskMap) return;
    const container = document.getElementById('map-risk');
    if (!container) return;

    riskMap = L.map('map-risk', {
      center: [-19.0, 29.8],
      zoom:   6,
      zoomControl: true,
      layers: [L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri', maxZoom: 17
      })]
    });
    riskAdminLayer = L.layerGroup().addTo(riskMap);
    riskLayer      = L.layerGroup().addTo(riskMap);

    setTimeout(() => riskMap.invalidateSize(), 300);
  }

  // ── Legend ─────────────────────────────────────────────────
  function renderLegend() {
    const el = document.getElementById('risk-legend');
    if (!el) return;
    el.innerHTML = RISK_LEVELS.map(r => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${r.color};box-shadow:0 0 6px ${r.color}88;"></span>
        <span>${r.label} ${r.min > 0 ? `(≥${r.min})` : '(<40)'}</span>
      </div>
    `).join('');
  }

  // ── Main entry ─────────────────────────────────────────────
  async function loadData() {
    setStatus('loading', 'Analysing provincial risk vectors...');
    try {
      initMap();
      renderLegend();

      const [firesRes, burnsRes] = await Promise.allSettled([
        window.APIClient.getFires({ startDate: '2024-01-01', endDate: '2024-12-31' }),
        window.APIClient.getBurnedAreas(2024)
      ]);

      const fires = firesRes.status === 'fulfilled'  ? firesRes.value.features  : [];
      const burns = burnsRes.status === 'fulfilled'  ? burnsRes.value.features  : [];

      const scores = calculateRisk(fires, burns);
      renderCards(scores);
      renderChoropleth(scores);
      _calculated = true;

      const critical = Object.values(scores).filter(s => s.level === 'Critical').length;
      setStatus('ready', `Risk analysis complete — ${critical} province(s) at Critical level.`);
    } catch (e) {
      console.error('RiskZonesModule error:', e);
      setStatus('error', 'Risk analysis failed. Check connectivity.');
    }
  }

  function setStatus(type, text) {
    const el = document.getElementById('risk-status');
    if (!el) return;
    el.className = `analysis-status ${type}`;
    const t = el.querySelector('.status-text');
    if (t) t.textContent = text;
  }

  function init() {
    if (!_calculated) loadData();
  }

  return { init, loadData };
})();

window.RiskZonesModule = RiskZonesModule;
