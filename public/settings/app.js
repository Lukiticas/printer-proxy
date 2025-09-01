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

(async function init() {
  attachEvents();
  try {
    await loadAll();
  } catch (e) {
    showMessage('Initial load failed: ' + e.message, 'error', 10000);
  }
})();