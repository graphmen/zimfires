/**
 * charts.js — Chart.js analytics charts and stat cards
 */

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

const CHART_OPTS_BASE = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#0a1a0a',
      borderColor: '#059669',
      borderWidth: 1,
      titleColor: '#ffffff',
      bodyColor: '#ecfdf5',
      padding: 12,
      cornerRadius: 8,
      displayColors: false
    }
  }
};

// ── Weekly time-series line chart ─────────────────────────────
let weeklyChart = null;

function buildWeeklyData(fires) {
  const allDates = fires.map(f => new Date(f.properties.observation_time || f.properties.datetime)).filter(d => !isNaN(d));
  if (allDates.length === 0) return { labels: [], data: [] };
  const SEASON_START = new Date(Math.min(...allDates));
  const weeks = {};
  fires.forEach(f => {
    const dt = new Date(f.properties.observation_time || f.properties.datetime);
    if (isNaN(dt)) return;
    const week = Math.floor((dt - SEASON_START) / (7 * 86400000));
    const label = weekLabel(SEASON_START, week);
    weeks[label] = (weeks[label] || 0) + 1;
  });
  const labels = Object.keys(weeks).sort();
  return { labels, data: labels.map(l => weeks[l]) };
}

function weekLabel(start, weekNum) {
  const d = new Date(start);
  d.setDate(d.getDate() + weekNum * 7);
  return d.toLocaleDateString('en-ZW', { day: '2-digit', month: 'short' });
}

function initWeeklyChart(fires) {
  const ctx = document.getElementById('chart-weekly');
  if (!ctx) return;
  const { labels, data } = buildWeeklyData(fires);
  weeklyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Fires Detected',
        data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      ...CHART_OPTS_BASE,
      scales: {
        x: { grid: { color: 'rgba(99,149,255,0.07)' }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(99,149,255,0.07)' }, beginAtZero: true }
      }
    }
  });
}

// ── Burned area by province bar chart ────────────────────────
let burnedChartInstances = {};

function buildBurnedByProvince(burnedFeatures) {
  const agg = {};
  burnedFeatures.forEach(f => {
    const p = f.properties;
    const prov = (p.province || 'UNKNOWN').toUpperCase();
    agg[prov] = (agg[prov] || 0) + (p.area_ha || 0);
  });
  const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
  return {
    labels: sorted.map(e => e[0].replace('MASHONALAND ', 'MSHLND ')),
    data:   sorted.map(e => Math.round(e[1] / 1000)),
    raw:    sorted.map(e => e[1])
  };
}

function initBurnedChart(burnedFeatures, canvasId = 'chart-burned') {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Destroy existing instance for this canvas if it exists
  if (burnedChartInstances[canvasId]) {
    burnedChartInstances[canvasId].destroy();
  }

  const { labels, data } = buildBurnedByProvince(burnedFeatures);
  burnedChartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Burned Area (×1000 ha)',
        data,
        backgroundColor: labels.map((_, i) => `hsla(150, 70%, ${45 + i * 5}%, 0.8)`),
        borderColor: 'transparent',
        borderRadius: 4
      }]
    },
    options: {
      ...CHART_OPTS_BASE,
      indexAxis: 'y',
      scales: {
        x: { grid: { color: 'rgba(99,149,255,0.07)' }, ticks: { callback: v => v + 'k ha' } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });
}

// ── Confidence doughnut ───────────────────────────────────────
let confChart = null;

function initConfChart(fires) {
  const ctx = document.getElementById('chart-confidence');
  if (!ctx) return;
  
  // Robust confidence counting (handling null/raw data)
  const high = fires.filter(f => {
    const c = (f.properties.confidence || '').toString().toLowerCase();
    return c === 'high' || c === 'h' || parseInt(c) >= 80;
  }).length;
  
  const low = fires.filter(f => {
    const c = (f.properties.confidence || '').toString().toLowerCase();
    return c === 'low' || c === 'l' || (parseInt(c) > 0 && parseInt(c) <= 30);
  }).length;
  
  const nominal = fires.length - high - low;

  confChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['High', 'Nominal / Unk', 'Low'],
      datasets: [{
        data: [high, nominal, low],
        backgroundColor: ['#ef4444', '#10b981', '#f59e0b'],
        borderColor: '#111827',
        borderWidth: 3,
        hoverOffset: 8
      }]
    },
    options: {
      ...CHART_OPTS_BASE,
      plugins: {
        ...CHART_OPTS_BASE.plugins,
        legend: { display: true, position: 'bottom', labels: { padding: 14, boxWidth: 10, color: '#94a3b8' } }
      },
      cutout: '65%'
    }
  });
}

// ── Historical trend chart (2001-2024) ─────────────────────────
let trendChart = null;

// Accepts pre-fetched data OR fetches it itself
async function initHistoricalTrendChart(trendData) {
  const ctx = document.getElementById('chart-historical-trend');
  if (!ctx) return;

  let data = trendData;
  if (!data || !data.length) {
    try { data = await window.APIClient.getHistoricalTrend(); } catch(e) { return; }
  }
  if (!data || !data.length) return;

  if (trendChart) { trendChart.destroy(); trendChart = null; }

  const labels = data.map(d => d.year);
  const values = data.map(d => d.count || d.total_count || 0);

  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Burn Polygons',
        data: values,
        backgroundColor: labels.map((_, i) => `hsla(${270 - i * 3}, 70%, 55%, 0.8)`),
        borderColor: '#6d28d9',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      ...CHART_OPTS_BASE,
      plugins: {
        ...CHART_OPTS_BASE.plugins,
        tooltip: {
          ...CHART_OPTS_BASE.plugins.tooltip,
          callbacks: { label: ctx => `${ctx.parsed.y.toLocaleString()} features` }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: 'rgba(99,149,255,0.07)' }, beginAtZero: true }
      }
    }
  });
}

// ── Stat cards ────────────────────────────────────────────────
function updateStatCards(fires) {
  const total     = fires.length;
  const highConf  = fires.filter(f => f.properties.confidence === 'high').length;
  const parks     = new Set(fires.filter(f => f.properties.near_park !== 'none').map(f => f.properties.near_park)).size;
  const provinces = new Set(fires.map(f => f.properties.province)).size;

  setCard('stat-total',      total,   '+' + total + ' this season');
  setCard('stat-high',       highConf, Math.round(highConf/Math.max(total,1)*100) + '% of detections');
  setCard('stat-parks',      parks,   'parks affected');
  setCard('stat-provinces',  provinces, 'of 10 provinces');
}

function setCard(id, value, sub) {
  const el = document.getElementById(id);
  if (!el) return;
  const valEl = el.querySelector('.stat-value');
  const subEl = el.querySelector('.stat-delta');
  if (valEl) animateCount(valEl, parseInt(valEl.textContent) || 0, value);
  if (subEl) subEl.textContent = sub;
}

function animateCount(el, from, to) {
  const duration = 600;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * progress);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── District hotspot table ────────────────────────────────────
function updateHotspotTable(fires) {
  const agg = {};
  fires.forEach(f => {
    const p = f.properties;
    if (!agg[p.province]) agg[p.province] = { count: 0, highCount: 0 };
    agg[p.province].count++;
    if (p.confidence === 'high') agg[p.province].highCount++;
  });
  const sorted = Object.entries(agg).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  const maxVal = sorted[0]?.[1].count || 1;

  const tbody = document.getElementById('hotspot-table-body');
  if (!tbody) return;
  tbody.innerHTML = sorted.map(([name, d]) => `
    <tr>
      <td>${name}</td>
      <td><b>${d.count}</b></td>
      <td>${d.highCount}</td>
      <td>
        <div class="severity-bar" style="width:${Math.round(d.count/maxVal*90)}px; background: hsl(${Math.round(120 - d.count/maxVal*120)},85%,50%)"></div>
      </td>
    </tr>
  `).join('');
}

// ── Master update ─────────────────────────────────────────────
function update(fires) {
  updateStatCards(fires);
  updateHotspotTable(fires);

  // Update weekly chart data
  if (weeklyChart) {
    const { labels, data } = buildWeeklyData(fires);
    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = data;
    weeklyChart.update('none');
  }

  // Update confidence chart
  if (confChart) {
    const high = fires.filter(f => f.properties.confidence === 'high').length;
    const low  = fires.filter(f => f.properties.confidence === 'low').length;
    confChart.data.datasets[0].data = [high, low];
    confChart.update('none');
  }
}

// ── CSV export ────────────────────────────────────────────────
function exportCSV() {
  const fires = FiltersModule.getAllFires();
  const filtered = FiltersModule.filterFires();
  const header = ['ID','Datetime','Confidence','Satellite','FRP_MW','Province','Landcover','Near_Park','Lat','Lng'];
  const rows = filtered.map(f => {
    const p = f.properties;
    const [lng, lat] = f.geometry.coordinates;
    return [p.id, p.datetime, p.confidence, p.satellite, p.frp, p.province, p.landcover, p.near_park, lat.toFixed(4), lng.toFixed(4)];
  });
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zimbabwe_fires_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('CSV Export', `${filtered.length} records exported`, 'success');
}

window.ChartsModule = { initWeeklyChart, initBurnedChart, initConfChart, initHistoricalTrendChart, update, updateHotspotTable, exportCSV };
