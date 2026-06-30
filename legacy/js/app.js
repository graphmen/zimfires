/**
 * app.js — Entry point: loads all data, initialises all modules
 */

// ── Toast system (global) ────────────────────────────────────
window.showToast = function (title, message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', danger: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

// ── System Health Monitoring ─────────────────────────────────
async function updateSystemStatus() {
  const badge = document.getElementById('system-health-badge');
  if (!badge) return;
  const text = badge.querySelector('.status-text');
  try {
    const diag = await window.APIClient.getSystemStatus();
    badge.classList.remove('online', 'degraded', 'offline', 'demo');
    if (diag.status === 'operational') {
      badge.classList.add('online');
      text.textContent = 'System Operational';
    } else if (diag.status === 'demo') {
      badge.classList.add('demo');
      text.textContent = 'Demo Mode (Mock Data)';
    } else {
      badge.classList.add('degraded');
      text.textContent = 'System Degraded';
    }
  } catch (e) {
    badge.classList.add('offline');
    text.textContent = 'System Offline';
  }
}

// ── View Management ──────────────────────────────────────────
const ViewManager = {
  viewOpened: { history: false, burned: false, parks: false, statistics: false, risk: false, alerts: false },
  init() {
    document.querySelectorAll('.nav-link[data-view]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTo(link.dataset.view);
      });
    });
  },
  switchTo(viewId) {
    document.querySelectorAll('.content-view').forEach(v => {
      v.classList.remove('active');
      v.style.display = 'none';
    });
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
      target.style.display = 'flex';

      if (viewId === 'history' && !this.viewOpened.history) {
        HistoryModule.loadYear(2023);
        this.viewOpened.history = true;
      }
      if (viewId === 'burned-area' && !this.viewOpened.burned) {
        BurnedAreaModule.loadYear(2023);
        this.viewOpened.burned = true;
      }
      if (viewId === 'national-parks' && !this.viewOpened.parks) {
        NationalParksModule.loadStatus();
        this.viewOpened.parks = true;
      }
      if (viewId === 'statistics' && !this.viewOpened.statistics) {
        StatisticsModule.init();
        this.viewOpened.statistics = true;
      }
      if (viewId === 'risk-zones' && !this.viewOpened.risk) {
        RiskZonesModule.init();
        this.viewOpened.risk = true;
      }
      if (viewId === 'alerts') {
        // AlertsModule is initialized at boot; just refresh table
        AlertsModule.renderTable();
      }
    }
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.view === viewId);
    });
    if (viewId === 'map-explorer' || viewId === 'dashboard') {
      const container = viewId === 'map-explorer'
        ? document.querySelector('.map-explorer-container')
        : document.getElementById('map-dashboard');
      const mapNode = document.getElementById('map');
      if (container && mapNode) {
        container.appendChild(mapNode);
        setTimeout(() => MapModule.map.invalidateSize(), 300);
      }
    }
  }
};
window.ViewManager = ViewManager;

// ── Dashboard Module ─────────────────────────────────────────
const DashboardModule = {
  calculateKPIs(fires, burned, parks, trend) {
    document.getElementById('active-fire-count').textContent = fires.length;
    const frps = fires.map(f => f.properties.frp || 0);
    document.getElementById('kpi-max-frp').innerHTML = `${frps.length ? Math.max(...frps).toFixed(1) : 0} <small>MW</small>`;
    const affected = new Set(fires.filter(f => f.properties.near_park !== 'none').map(f => f.properties.near_park));
    document.getElementById('kpi-parks-affected').textContent = affected.size;
    const latest = trend.find(d => d.year === 2024) || { total_area_ha: 0 };
    document.getElementById('kpi-burned-area').innerHTML = `${(latest.total_area_ha / 100).toFixed(0)} <small>km²</small>`;
    document.getElementById('kpi-high-conf').textContent = fires.filter(f => f.properties.confidence === 'high').length;
    this.populateAlerts(fires);
  },
  populateAlerts(fires) {
    const feed = document.getElementById('alerts-feed');
    if (!feed) return;
    feed.innerHTML = '';
    fires.sort((a, b) => (b.properties.frp || 0) - (a.properties.frp || 0)).slice(0, 10).forEach(f => {
      const p = f.properties;
      const critical = p.frp > 200 && p.confidence === 'high';
      const item = document.createElement('div');
      item.className = `alert-item ${critical ? 'critical' : ''}`;
      const timeStr = p.observation_time ? new Date(p.observation_time).toLocaleTimeString() : 'Recent';
      const parkInfo = p.near_park && p.near_park !== 'none' ? ` (${p.near_park})` : '';
      item.innerHTML = `
        <div class="alert-icon">${critical ? '🔥' : '⚠️'}</div>
        <div class="alert-info">
          <div class="alert-title">${p.sensor || 'Fire'} Detection${parkInfo}</div>
          <div class="alert-meta">FRP ${p.frp || 'N/A'}MW • Conf: ${p.confidence || 'Nominal'}</div>
          <div class="alert-time">${timeStr}</div>
        </div>
      `;
      item.onclick = () => {
        ViewManager.switchTo('map-explorer');
        MapModule.map.setView([f.geometry.coordinates[1], f.geometry.coordinates[0]], 12);
      };
      feed.appendChild(item);
    });
  }
};
window.DashboardModule = DashboardModule;

// ── History Module ───────────────────────────────────────────
const HistoryModule = {
  async loadYear(year) {
    this.updateStatus('loading', `Fetching archival records for ${year}...`);
    try {
      const gj = await window.APIClient.getFires({ startDate: `${year}-01-01`, endDate: `${year}-12-31` });
      this.updateUI(gj.features, year);
      this.updateStatus('ready', `${gj.features.length} records loaded for ${year}.`);
      MapModule.renderHistoricalFires(gj.features);
    } catch (e) {
      console.error(e);
      this.updateStatus('error', 'Archival fetch failed.');
    }
  },
  updateUI(features, year) {
    const totalEl = document.getElementById('history-total-fires');
    if (totalEl) totalEl.textContent = features.length;

    const tbody = document.getElementById('history-table-body');
    if (tbody) {
      tbody.innerHTML = features.length === 0
        ? `<tr><td colspan="4" style="text-align:center;padding:2rem;">No records for ${year}</td></tr>`
        : features.slice(0, 50).map(f => `
          <tr>
            <td>${new Date(f.properties.observation_time || f.properties.datetime || '').toLocaleDateString()}</td>
            <td>${f.properties.sensor || 'N/A'}</td>
            <td>${f.properties.confidence || 'N/A'}</td>
            <td>${f.properties.frp || 'N/A'}</td>
          </tr>`).join('');
    }
    const topProvEl = document.getElementById('history-top-province');
    if (topProvEl) {
      const counts = {};
      features.forEach(f => {
        const p = f.properties.sensor || 'Unknown';
        counts[p] = (counts[p] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      topProvEl.textContent = top ? top[0] : '---';
    }
  },
  updateStatus(type, text) {
    const el = document.getElementById('history-status');
    if (el) { el.className = `analysis-status ${type}`; el.querySelector('.status-text').textContent = text; }
  }
};
window.HistoryModule = HistoryModule;

// ── Burned Area Module ───────────────────────────────────────
const BurnedAreaModule = {
  async loadYear(year) {
    this.updateStatus('loading', `Analysing satellite footprints for ${year}...`);
    try {
      const gj = await window.APIClient.getBurnedAreas(year);
      const totalHa = gj.features.reduce((acc, f) => acc + (f.properties.area_ha || 0), 0);
      document.getElementById('burned-total-ha').innerHTML = `${Math.round(totalHa).toLocaleString()} <small>ha</small>`;
      document.getElementById('burned-percentage').textContent = `${(totalHa / 390757).toFixed(2)}% of Country`;
      if (window.ChartsModule) ChartsModule.initBurnedChart(gj.features, 'chart-burned-distribution');
      MapModule.renderBurnedAreas(gj);
      this.updateStatus('ready', `Satellite analysis complete for ${year}.`);
    } catch (e) {
      console.error(e);
      this.updateStatus('error', 'Footprint analysis failed.');
    }
  },
  updateStatus(type, text) {
    const el = document.getElementById('burned-status');
    if (el) { el.className = `analysis-status ${type}`; el.querySelector('.status-text').textContent = text; }
  }
};
window.BurnedAreaModule = BurnedAreaModule;

// ── Statistics Module ────────────────────────────────────────
const StatisticsModule = {
  currentYear: 2023,
  currentMode: 'cluster',
  fireCache: {},
  burnCache: {},
  trendData: [],

  async init() {
    // Populate year selector 2024→2001
    const sel = document.getElementById('stats-year-select');
    if (sel && sel.options.length === 0) {
      for (let y = 2024; y >= 2001; y--) {
        const o = document.createElement('option');
        o.value = y;
        o.textContent = y;
        if (y === this.currentYear) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', e => {
        this.currentYear = parseInt(e.target.value);
        this.loadYear(this.currentYear);
      });
    }

    // Mode toggle buttons
    ['cluster', 'heatmap', 'burns'].forEach(mode => {
      const btn = document.getElementById(`btn-mode-${mode}`);
      if (btn) btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = mode;
        const fires = this.fireCache[this.currentYear] || [];
        const burns = this.burnCache[this.currentYear] || [];
        MapModule.refreshStatsMap(mode, fires, burns);
      });
    });

    // Initialise secondary map
    MapModule.initStatsMap();

    // Load trend chart first (doesn't depend on year)
    this.trendData = await window.APIClient.getHistoricalTrend();
    if (window.ChartsModule) ChartsModule.initHistoricalTrendChart(this.trendData);

    // Load default year
    await this.loadYear(this.currentYear);
  },

  async loadYear(year) {
    this.updateStatus('loading', `Loading spatial data for ${year}...`);
    const label = document.getElementById('stats-map-year-label');
    if (label) label.textContent = year;

    try {
      // Fetch fires & burns in parallel; use cache
      const [firesGJ, burnsGJ] = await Promise.all([
        this.fireCache[year]
          ? Promise.resolve({ features: this.fireCache[year] })
          : window.APIClient.getFires({ startDate: `${year}-01-01`, endDate: `${year}-12-31` }),
        this.burnCache[year]
          ? Promise.resolve({ features: this.burnCache[year] })
          : window.APIClient.getBurnedAreas(year)
      ]);

      // Cache results
      this.fireCache[year] = firesGJ.features;
      this.burnCache[year] = burnsGJ.features;

      // Update KPIs
      this.updateKPIs(firesGJ.features, burnsGJ.features);

      // Update table
      if (window.ChartsModule) {
        ChartsModule.updateHotspotTable(firesGJ.features);
        ChartsModule.initBurnedChart(burnsGJ.features, 'chart-burned');
      }

      // Render on stats map
      MapModule.refreshStatsMap(this.currentMode, firesGJ.features, burnsGJ.features);

      this.updateStatus('ready', `${firesGJ.features.length} fire points • ${burnsGJ.features.length} burn polygons loaded for ${year}.`);
    } catch (e) {
      console.error('StatisticsModule error:', e);
      this.updateStatus('error', 'Failed to load data.');
    }
  },

  updateKPIs(fires, burns) {
    // Fire count
    const fcEl = document.getElementById('stats-fire-count');
    if (fcEl) fcEl.textContent = fires.length.toLocaleString();

    // Burned area
    const totalHa = burns.reduce((acc, f) => acc + (f.properties.area_ha || 0), 0);
    const haEl = document.getElementById('stats-burned-ha');
    if (haEl) haEl.textContent = totalHa > 0 ? (totalHa / 1000).toFixed(0) + 'k' : '—';

    // Top province (from burn data)
    const provTotals = {};
    burns.forEach(f => {
      const p = (f.properties.province || 'Unknown').toUpperCase();
      provTotals[p] = (provTotals[p] || 0) + (f.properties.area_ha || 0);
    });
    const topEntry = Object.entries(provTotals).sort((a, b) => b[1] - a[1])[0];
    const topEl = document.getElementById('stats-top-province');
    if (topEl) topEl.textContent = topEntry
      ? topEntry[0].replace('MASHONALAND ', 'MSHLND ').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')
      : '—';

    // % of country (Zimbabwe total ~39M ha)
    const pctEl = document.getElementById('stats-pct-country');
    if (pctEl) pctEl.textContent = totalHa > 0 ? (totalHa / 390000 * 100).toFixed(1) + '%' : '—';
  },

  updateStatus(type, text) {
    const el = document.getElementById('stats-status');
    if (!el) return;
    el.className = `stats-status analysis-status ${type}`;
    const t = el.querySelector('.status-text');
    if (t) t.textContent = text;
  }
};
window.StatisticsModule = StatisticsModule;

// ── National Parks Module ────────────────────────────────────
const NationalParksModule = {
  majorParks: [
    { name: 'Hwange', type: 'National Park', area: '14,651 km²' },
    { name: 'Mana Pools', type: 'National Park', area: '2,196 km²' },
    { name: 'Gonarezhou', type: 'National Park', area: '5,053 km²' },
    { name: 'Matobo', type: 'National Park', area: '424 km²' },
    { name: 'Nyanga', type: 'National Park', area: '472 km²' },
    { name: 'Chizarira', type: 'National Park', area: '2,000 km²' },
    { name: 'Matusadona', type: 'National Park', area: '1,407 km²' }
  ],
  async loadStatus() {
    const badge = document.getElementById('parks-status-badge');
    if (badge) badge.classList.add('loading');
    try {
      const geo = await window.APIClient.getFires(48);
      this.updateUI(geo.features);
    } catch (e) {
      console.error(e);
    } finally {
      if (badge) badge.classList.remove('loading');
    }
  },
  updateUI(fires) {
    const container = document.getElementById('parks-grid-container');
    if (!container) return;
    container.innerHTML = '';
    let totalHotspots = 0;
    this.majorParks.forEach(park => {
      const parkFires = fires.filter(f =>
        (f.properties.near_park || '').toLowerCase().includes(park.name.toLowerCase())
      );
      const count = parkFires.length;
      totalHotspots += count;
      const card = document.createElement('div');
      card.className = 'park-card';
      card.innerHTML = `
        <span class="park-status-badge ${count > 0 ? 'status-alert' : 'status-safe'}">${count > 0 ? 'Incursion' : 'Safe'}</span>
        <div class="park-type">${park.type}</div>
        <h3>${park.name}</h3>
        <div class="park-card-stats">
          <div class="stat"><span class="stat-label">Hotspots</span><span class="stat-value">${count}</span></div>
          <div class="stat"><span class="stat-label">Area</span><span class="stat-value">${park.area}</span></div>
        </div>
      `;
      card.onclick = () => {
        ViewManager.switchTo('map-explorer');
        if (count > 0) MapModule.map.setView([parkFires[0].geometry.coordinates[1], parkFires[0].geometry.coordinates[0]], 10);
      };
      container.appendChild(card);
    });
    const totalEl = document.getElementById('park-total-hotspots');
    if (totalEl) totalEl.textContent = totalHotspots;
  }
};
window.NationalParksModule = NationalParksModule;

// ── Utils ────────────────────────────────────────────────────
function startClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const tick = () => el.textContent = new Date().toLocaleString('en-ZW') + ' CAT';
  tick();
  setInterval(tick, 1000);
}

// ── Main data loader ─────────────────────────────────────────
async function loadData() {
  updateSystemStatus();
  try {
    const [trend, fires, provinces, parks] = await Promise.allSettled([
      window.APIClient.getHistoricalTrend(),
      window.APIClient.getFires(48),
      window.APIClient.getBoundaries('province'),
      window.APIClient.getBoundaries('park')
    ]);

    const trendData = trend.status === 'fulfilled' ? trend.value : [];
    const firesData = fires.status === 'fulfilled' ? fires.value : { features: [] };
    const provData = provinces.status === 'fulfilled' ? provinces.value : { features: [] };
    const parksData = parks.status === 'fulfilled' ? parks.value : { features: [] };

    if (provData.features.length) MapModule.renderProvinces(provData);
    if (parksData.features.length) MapModule.renderParks(parksData);
    if (firesData.features.length) MapModule.renderFires(firesData.features);

    DashboardModule.calculateKPIs(firesData.features, [], [], trendData);

    // Init charts for dashboard
    if (window.ChartsModule) {
      ChartsModule.initWeeklyChart(firesData.features);
      ChartsModule.initConfChart(firesData.features);
    }

    // Check for alerts on hot data
    if (window.AlertsModule) {
      AlertsModule.checkFires(firesData.features);
    }

    initAnalysisFilters();
    updateSystemStatus();
  } catch (e) {
    console.error('Load failed', e);
  }
}

function initAnalysisFilters() {
  const years = [];
  for (let y = 2024; y >= 2001; y--) years.push(y);

  const hSel = document.getElementById('history-year-select');
  const bSel = document.getElementById('burned-year-select');

  if (hSel && hSel.options.length === 0) {
    years.forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      hSel.appendChild(o);
    });
    hSel.onchange = e => HistoryModule.loadYear(e.target.value);
  }
  if (bSel && bSel.options.length === 0) {
    years.forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      bSel.appendChild(o);
    });
    bSel.onchange = e => BurnedAreaModule.loadYear(e.target.value);
  }
}

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  ViewManager.init();
  ViewManager.switchTo('dashboard');
  window.app = ViewManager;

  // Pre-init Alerts so they can listen to data loads
  if (window.AlertsModule) AlertsModule.init();

  loadData();
  setInterval(updateSystemStatus, 60000);
});
