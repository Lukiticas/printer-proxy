const state = {
  settings: null,
  runtime: null,
  printers: [],
  original: null,
  changed: new Set(),
  timer: null
};

const els = {
  host: document.getElementById('host'),
  port: document.getElementById('port'),
  defaultPrinter: document.getElementById('defaultPrinter'),
  defaultPrinterStatus: document.getElementById('defaultPrinterStatus'),
  btnSave: document.getElementById('btnSave'),
  btnReloadEnv: document.getElementById('btnReloadEnv'),
  btnRefreshPrinters: document.getElementById('btnRefreshPrinters'),
  messages: document.getElementById('messages'),
  version: document.getElementById('version'),
  uptime: document.getElementById('uptime'),
  lastUpdated: document.getElementById('lastUpdated')
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }

  return res.json();
}

function showMessage(msg, type = 'info', timeout = 4000) {
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  div.textContent = msg;
  els.messages.appendChild(div);
  setTimeout(() => div.remove(), timeout);
}

function markChanged(field, changed) {
  if (changed) {
    state.changed.add(field);
  } else {
    state.changed.delete(field);
  }

  els.btnSave.disabled = state.changed.size === 0;
}

function updatePrinterStatus() {
  if (!state.settings) {
    return;
  }

  const selected = els.defaultPrinter.value;

  if (!selected) {
    els.defaultPrinterStatus.textContent = 'No default selected';
    els.defaultPrinterStatus.className = 'status warn';
    return;
  }

  if (!state.printers.includes(selected)) {
    els.defaultPrinterStatus.textContent = `Stale: "${selected}" not currently available`;
    els.defaultPrinterStatus.className = 'status error';
    return
  }

  els.defaultPrinterStatus.textContent = 'Active';
  els.defaultPrinterStatus.className = 'status ok';
}

function applySettingsToForm() {
  els.host.value = state.settings.host;
  els.port.value = state.settings.port;

  buildPrinterSelect();

  if (state.settings.defaultPrinter) {
    els.defaultPrinter.value = state.settings.defaultPrinter;
  }

  updatePrinterStatus();

  state.original = JSON.parse(JSON.stringify({
    host: els.host.value,
    port: Number(els.port.value),
    defaultPrinter: els.defaultPrinter.value || undefined
  }));

  state.changed.clear();

  els.btnSave.disabled = true;
}

function buildPrinterSelect() {
  const sel = els.defaultPrinter;
  sel.innerHTML = '';
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '(none)';
  sel.appendChild(optNone);

  state.printers.forEach(p => {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = p;
    sel.appendChild(o);
  });
}

async function loadAll() {
  const cfg = await api('/config');
  state.settings = cfg.settings;
  state.runtime = cfg.runtime;
  const avail = await api('/available');
  state.printers = avail.printers.map(p => p.name);

  applySettingsToForm();

  const health = await api('/health').catch(() => null);

  if (health) {
    els.version.textContent = 'Version: ' + (health.version || 'n/a');
    els.uptime.textContent = 'Uptime: ' + Math.floor(health.uptimeSeconds) + 's';
  }

  els.lastUpdated.textContent = 'Loaded: ' + new Date().toLocaleTimeString();
}

function detectChanges() {
  const current = {
    host: els.host.value,
    port: Number(els.port.value),
    defaultPrinter: els.defaultPrinter.value || undefined
  };

  ['host', 'port', 'defaultPrinter'].forEach(k => {
    markChanged(k, JSON.stringify(current[k]) !== JSON.stringify(state.original[k]));
  });
}

async function saveChanges() {
  const patch = {};

  if (state.changed.has('host')) {
    patch.host = els.host.value.trim();
  }
  if (state.changed.has('port')) {
    patch.port = Number(els.port.value);
  }

  if (state.changed.has('defaultPrinter')) {
    patch.defaultPrinter = els.defaultPrinter.value || undefined;
  }

  try {
    const res = await api('/config', {
      method: 'PUT',
      body: JSON.stringify(patch)
    });

    state.settings = res.settings;

    showMessage('Saved settings (changed: ' + res.changedKeys.join(', ') + ')', 'success');

    await loadPrintersOnly();

    applySettingsToForm();

    if (res.restartRequired.length) {
      showMessage('Restart required for: ' + res.restartRequired.join(', '), 'warn', 8000);
    }
  } catch (e) {
    showMessage('Save failed: ' + e.message, 'error', 6000);
  }
}

async function loadPrintersOnly() {
  const avail = await api('/available');
  state.printers = avail.printers.map(p => p.name);
}

async function reloadFromEnv() {
  try {
    const res = await api('/config/reload-env', { method: 'POST' });
    state.settings = res.settings;
    await loadPrintersOnly();
    applySettingsToForm();
    showMessage('Reloaded from .env (changed: ' + res.changedKeys.join(', ') + ')', 'success');
  } catch (e) {
    showMessage('Reload failed: ' + e.message, 'error');
  }
}

function attachEvents() {
  els.host.addEventListener('input', detectChanges);
  els.port.addEventListener('input', detectChanges);
  els.defaultPrinter.addEventListener('change', () => {
    detectChanges();
    updatePrinterStatus();
  });
  els.btnSave.addEventListener('click', saveChanges);
  els.btnReloadEnv.addEventListener('click', reloadFromEnv);
  els.btnRefreshPrinters.addEventListener('click', async () => {
    await loadPrintersOnly();

    buildPrinterSelect();

    if (state.settings.defaultPrinter) {
      els.defaultPrinter.value = state.settings.defaultPrinter;
    }

    updatePrinterStatus();

    showMessage('Printers refreshed', 'info');
  });

  state.timer = setInterval(async () => {
    const health = await api('/health').catch(() => null);
    if (health) {
      els.uptime.textContent = 'Uptime: ' + Math.floor(health.uptimeSeconds) + 's';
    }
  }, 5000);
}

const sec = {
  whitelistEl: null,
  blacklistEl: null,
  pendingEl: null,
  btnSecRefresh: null
};

function initSecurityUIRefs() {
  sec.whitelistEl = document.getElementById('whitelistList');
  sec.blacklistEl = document.getElementById('blacklistList');
  sec.pendingEl = document.getElementById('pendingList');
  sec.btnSecRefresh = document.getElementById('btnSecurityRefresh');
  if (sec.btnSecRefresh) {
    sec.btnSecRefresh.addEventListener('click', refreshSecurityState);
  }
}

async function refreshSecurityState() {
  try {
    const st = await api('/security/state');
    renderList(sec.whitelistEl, st.whitelist, 'whitelist');
    renderList(sec.blacklistEl, st.blacklist, 'blacklist');
    renderPending(st.pending);
  } catch (e) {
    showMessage('Security state load failed: ' + e.message, 'error');
  }
}

function renderList(container, items, listType) {
  if (!container) return;
  container.innerHTML = '';
  if (!items.length) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = '(empty)';
    container.appendChild(p);
    return;
  }
  items.forEach(host => {
    const row = document.createElement('div');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = host;
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.className = 'tiny danger';
    btn.onclick = () => removeEntry(listType, host);
    row.appendChild(span);
    row.appendChild(btn);
    container.appendChild(row);
  });
}

async function removeEntry(listType, host) {
  try {
    const url = `/security/${listType}/${encodeURIComponent(host)}`;
    await fetch(url, { method: 'DELETE' });
    showMessage(`Removed ${host} from ${listType}`, 'success');
    refreshSecurityState();
  } catch (e) {
    showMessage('Remove failed: ' + e.message, 'error');
  }
}

function renderPending(pending) {
  if (!sec.pendingEl) return;
  sec.pendingEl.innerHTML = '';
  if (!pending.length) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = '(none)';
    sec.pendingEl.appendChild(p);
    return;
  }
  pending.forEach(pe => {
    const row = document.createElement('div');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = `${pe.host} (${pe.action}) attempts:${pe.attempts}`;
    row.appendChild(span);
    sec.pendingEl.appendChild(row);
  });
}

(async function init() {
  attachEvents();
  initSecurityUIRefs();
  try {
    await loadAll();
    await refreshSecurityState();
  } catch (e) {
    showMessage('Initial load failed: ' + e.message, 'error', 10000);
  }
})();