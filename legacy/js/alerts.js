/**
 * alerts.js — Full Alert Management Module
 * Supports: creating, listing, toggling, and deleting custom fire alerts.
 * Persistence via localStorage.
 */

const AlertsModule = (() => {
  const STORAGE_KEY = 'zimfire_alerts';
  let alertsList = [];
  let editingId = null;

  // ── Zimbabwe Provinces list ────────────────────────────────
  const PROVINCES = [
    'All Provinces', 'Harare', 'Bulawayo', 'Manicaland',
    'Mashonaland Central', 'Mashonaland East', 'Mashonaland West',
    'Masvingo', 'Matabeleland North', 'Matabeleland South', 'Midlands'
  ];

  const PARKS = [
    'Any Park', 'Hwange National Park', 'Mana Pools National Park',
    'Gonarezhou National Park', 'Matobo National Park',
    'Nyanga National Park', 'Chizarira National Park',
    'Matusadona National Park'
  ];

  // ── Persistence ────────────────────────────────────────────
  function load() {
    try {
      alertsList = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { alertsList = []; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alertsList));
  }

  // ── Rendering ──────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('alerts-mgmt-tbody');
    const emptyState = document.getElementById('alerts-empty-state');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (alertsList.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    alertsList.forEach((alert, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="alert-name-cell">
            <span class="alert-severity-dot" style="background:${severityColor(alert.severity)}"></span>
            <strong>${escHtml(alert.name)}</strong>
          </div>
        </td>
        <td>${escHtml(alert.province || 'All Provinces')}</td>
        <td>
          <div class="channel-chips">
            ${(alert.channels || []).map(c => `<span class="channel-chip ${c.toLowerCase()}">${c}</span>`).join('')}
          </div>
        </td>
        <td><span class="rule-summary">${buildRuleSummary(alert)}</span></td>
        <td>
          <label class="toggle-switch">
            <input type="checkbox" ${alert.active ? 'checked' : ''} onchange="AlertsModule.toggleAlert(${i}, this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </td>
        <td>
          <div class="row-actions">
            <button class="row-btn edit-btn" onclick="AlertsModule.openModal(${i})" title="Edit">✏️</button>
            <button class="row-btn delete-btn" onclick="AlertsModule.deleteAlert(${i})" title="Delete">🗑</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Update summary counters
    const activeCount = alertsList.filter(a => a.active).length;
    const elActive = document.getElementById('alerts-count-active');
    const elTotal  = document.getElementById('alerts-count-total');
    if (elActive) elActive.textContent = activeCount;
    if (elTotal)  elTotal.textContent  = alertsList.length;
  }

  function buildRuleSummary(alert) {
    const parts = [];
    if (alert.minFrp)   parts.push(`FRP ≥ ${alert.minFrp} MW`);
    if (alert.confidence && alert.confidence !== 'all') parts.push(`Conf: ${alert.confidence}`);
    if (alert.parkOnly) parts.push('Park incursion only');
    return parts.length ? parts.join(' • ') : 'Any fire detected';
  }

  function severityColor(s) {
    const map = { critical: '#ef4444', high: '#f97316', medium: '#fbbf24', info: '#60a5fa' };
    return map[s] || '#60a5fa';
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ── Modal Management ───────────────────────────────────────
  function openModal(editIndex = null) {
    editingId = editIndex;
    const modal = document.getElementById('alert-modal');
    if (!modal) return;

    populateProvinces();
    populateParkSelect();

    if (editIndex !== null && alertsList[editIndex]) {
      const a = alertsList[editIndex];
      document.getElementById('alert-modal-title').textContent = 'Edit Alert';
      document.getElementById('am-name').value           = a.name || '';
      document.getElementById('am-province').value       = a.province || 'All Provinces';
      document.getElementById('am-park').value           = a.park || 'Any Park';
      document.getElementById('am-severity').value       = a.severity || 'high';
      document.getElementById('am-min-frp').value        = a.minFrp || '';
      document.getElementById('am-confidence').value     = a.confidence || 'all';
      document.getElementById('am-park-only').checked    = a.parkOnly || false;

      // Channels
      document.querySelectorAll('.channel-toggle-btn').forEach(btn => {
        btn.classList.toggle('selected', (a.channels || []).includes(btn.dataset.channel));
      });
    } else {
      document.getElementById('alert-modal-title').textContent = 'New Alert Rule';
      document.getElementById('am-name').value           = '';
      document.getElementById('am-province').value       = 'All Provinces';
      document.getElementById('am-park').value           = 'Any Park';
      document.getElementById('am-severity').value       = 'high';
      document.getElementById('am-min-frp').value        = '';
      document.getElementById('am-confidence').value     = 'all';
      document.getElementById('am-park-only').checked    = false;
      document.querySelectorAll('.channel-toggle-btn').forEach(btn => btn.classList.remove('selected'));
    }

    modal.classList.add('open');
  }

  function closeModal() {
    const modal = document.getElementById('alert-modal');
    if (modal) modal.classList.remove('open');
    editingId = null;
  }

  function populateProvinces() {
    const sel = document.getElementById('am-province');
    if (!sel || sel.options.length > 1) return;
    sel.innerHTML = '';
    PROVINCES.forEach(p => {
      const o = document.createElement('option');
      o.value = o.textContent = p;
      sel.appendChild(o);
    });
  }

  function populateParkSelect() {
    const sel = document.getElementById('am-park');
    if (!sel || sel.options.length > 1) return;
    sel.innerHTML = '';
    PARKS.forEach(p => {
      const o = document.createElement('option');
      o.value = o.textContent = p;
      sel.appendChild(o);
    });
  }

  // ── Save / Delete / Toggle ─────────────────────────────────
  function saveAlert() {
    const name = (document.getElementById('am-name')?.value || '').trim();
    if (!name) {
      showToast('Validation Error', 'Please enter an alert name.', 'danger');
      return;
    }

    const channels = [...document.querySelectorAll('.channel-toggle-btn.selected')]
      .map(b => b.dataset.channel);

    if (channels.length === 0) {
      showToast('Validation Error', 'Select at least one notification channel.', 'danger');
      return;
    }

    const alert = {
      id: editingId !== null ? alertsList[editingId].id : Date.now(),
      name,
      province:    document.getElementById('am-province')?.value || 'All Provinces',
      park:        document.getElementById('am-park')?.value     || 'Any Park',
      severity:    document.getElementById('am-severity')?.value || 'high',
      minFrp:      parseInt(document.getElementById('am-min-frp')?.value) || null,
      confidence:  document.getElementById('am-confidence')?.value || 'all',
      parkOnly:    document.getElementById('am-park-only')?.checked || false,
      channels,
      active: true,
      created: editingId !== null ? alertsList[editingId].created : new Date().toISOString()
    };

    if (editingId !== null) {
      alertsList[editingId] = alert;
      showToast('✅ Alert Updated', `"${name}" has been saved.`, 'success');
    } else {
      alertsList.unshift(alert);
      showToast('🔔 Alert Created', `"${name}" is now active.`, 'success');
    }

    save();
    renderTable();
    closeModal();
  }

  function deleteAlert(index) {
    const name = alertsList[index]?.name;
    alertsList.splice(index, 1);
    save();
    renderTable();
    showToast('Alert Removed', `"${name}" deleted.`, 'info');
  }

  function toggleAlert(index, active) {
    if (alertsList[index]) {
      alertsList[index].active = active;
      save();
      renderTable();
      const status = active ? 'activated' : 'paused';
      showToast('Alert ' + (active ? '✅ Activated' : '⏸ Paused'), `"${alertsList[index].name}" ${status}.`, 'info');
    }
  }

  // ── Fire event matching ─────────────────────────────────────
  /**
   * Check incoming fires against active alert rules.
   * @param {Array} fires - GeoJSON features
   */
  function checkFires(fires) {
    const active = alertsList.filter(a => a.active);
    if (!active.length) return;

    fires.forEach(f => {
      const p = f.properties;
      active.forEach(rule => {
        // Province match
        if (rule.province !== 'All Provinces' && (p.province || '').toUpperCase() !== rule.province.toUpperCase()) return;

        // Park match
        if (rule.parkOnly && (!p.near_park || p.near_park === 'none')) return;
        if (rule.park && rule.park !== 'Any Park' && !(p.near_park || '').toLowerCase().includes(rule.park.toLowerCase().split(' ')[0])) return;

        // Confidence
        const conf = (p.confidence || '').toLowerCase();
        if (rule.confidence !== 'all' && conf !== rule.confidence) return;

        // Min FRP
        const frp = parseFloat(p.frp || 0);
        if (rule.minFrp && frp < rule.minFrp) return;

        // Rule matched — trigger toast notification
        const parkLabel = p.near_park && p.near_park !== 'none' ? ` — ${p.near_park}` : '';
        showToast(
          `🔔 ${rule.name}`,
          `${rule.severity.toUpperCase()} fire detected${parkLabel}. FRP: ${frp.toFixed(1)} MW`,
          rule.severity === 'critical' ? 'danger' : 'warning'
        );
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    load();
    renderTable();

    // Wire modal buttons
    document.getElementById('btn-new-alert')?.addEventListener('click', () => openModal());
    document.getElementById('btn-new-alert-empty')?.addEventListener('click', () => openModal());
    document.getElementById('am-cancel')?.addEventListener('click', closeModal);
    document.getElementById('am-save')?.addEventListener('click', saveAlert);
    document.getElementById('alert-modal-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('alert-modal-overlay')) closeModal();
    });

    // Channel toggle buttons
    document.querySelectorAll('.channel-toggle-btn').forEach(btn => {
      // Use named function to avoid double-adding if init is called multiple times
      btn.onclick = () => btn.classList.toggle('selected');
    });
  }

  // Public API
  return { init, openModal, closeModal, saveAlert, deleteAlert, toggleAlert, checkFires, renderTable, getAll: () => alertsList };
})();

window.AlertsModule = AlertsModule;
