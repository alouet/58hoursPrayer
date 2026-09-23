/* ==========================================================================
   sync.js — cloud synchronization layer (adapter-based, no fake backend)
   ---------------------------------------------------------------------------
   The app is fully functional offline. Sync is optional: when an adapter is
   configured, local changes are pushed and remote changes merged using
   per-record updatedAt timestamps (newest wins; deletions are tombstones).

   Built-in adapter:  "rest"  — any HTTPS endpoint you control that supports
     GET  <endpoint>  -> 200 { snapshot }   (or 404 when empty)
     PUT  <endpoint>  <- { snapshot }       (JSON body)
   with an optional "Authorization: Bearer <token>" header. See README for a
   30-line Cloudflare Worker / Supabase / Firebase example.

   To add another provider, register an adapter: M.Sync.register('name', {
     pull: async (cfg) => snapshot|null, push: async (cfg, snapshot) => void })
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const adapters = {};
  let status = 'local';          // local | synced | syncing | offline | error
  let lastError = '';
  let timer = null;
  let running = false;

  const LABEL = {
    local: 'Saved on this device',
    synced: 'Synced',
    syncing: 'Syncing…',
    offline: 'Offline — changes saved locally',
    error: 'Sync paused — changes saved locally'
  };

  adapters.rest = {
    async pull(cfg) {
      const r = await fetch(cfg.endpoint, { headers: headers(cfg), cache: 'no-store' });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('Server responded ' + r.status);
      const txt = await r.text();
      return txt ? JSON.parse(txt) : null;
    },
    async push(cfg, snap) {
      const r = await fetch(cfg.endpoint, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, headers(cfg)), body: JSON.stringify(snap) });
      if (!r.ok) throw new Error('Server responded ' + r.status);
    }
  };
  function headers(cfg) { return cfg.token ? { Authorization: 'Bearer ' + cfg.token } : {}; }

  function cfg() { return M.state.settings.sync || { adapter: 'none' }; }
  function configured() { const c = cfg(); return c.adapter && c.adapter !== 'none' && adapters[c.adapter] && (c.adapter !== 'rest' || /^https?:\/\//.test(c.endpoint || '')); }

  function setStatus(s, err) {
    status = s; lastError = err || '';
    const el = document.getElementById('sync-status');
    if (el) {
      el.dataset.state = s;
      el.querySelector('.sync-label').textContent = LABEL[s];
      el.title = lastError ? LABEL[s] + ' (' + lastError + ')' : LABEL[s];
    }
    document.querySelectorAll('[data-sync-detail]').forEach((n) => { n.textContent = LABEL[s] + (lastError ? ' — ' + lastError : ''); });
  }

  const Sync = {
    register(name, adapter) { adapters[name] = adapter; },
    get status() { return status; },
    label() { return LABEL[status]; },
    configured,
    init() {
      M.Storage.onChange(() => Sync.schedule());
      window.addEventListener('online', () => Sync.syncNow());
      window.addEventListener('offline', () => { if (configured()) setStatus('offline'); });
      setStatus(configured() ? (navigator.onLine ? 'synced' : 'offline') : 'local');
      if (configured()) Sync.syncNow();
    },
    schedule() {
      if (!configured()) return;
      clearTimeout(timer);
      timer = setTimeout(() => Sync.syncNow(), 4000);
    },
    /** Pull → merge → push. Never throws; failures leave local data intact. */
    async syncNow() {
      if (!configured()) { setStatus('local'); return false; }
      if (!navigator.onLine) { setStatus('offline'); return false; }
      if (running) return false;
      running = true; setStatus('syncing');
      const c = cfg(); const ad = adapters[c.adapter];
      try {
        const remote = await ad.pull(c);
        if (remote && typeof remote === 'object') {
          M.Storage.COLLECTIONS.forEach((k) => { if (Array.isArray(remote[k])) M.state[k] = M.Storage.mergeRecords(M.state[k], remote[k]); });
          M.Storage.DOCS.forEach((k) => {
            if (k === 'settings') return; // settings stay per-device (theme, PIN, credentials)
            if (remote[k] && (remote[k].updatedAt || 0) > (M.state[k].updatedAt || 0)) M.state[k] = remote[k];
          });
          M.state = M.Storage.sanitize(M.state);
        }
        const snap = {};
        M.Storage.KEYS.forEach((k) => { if (k !== 'settings') snap[k] = M.state[k]; });
        snap.syncedAt = Date.now();
        await ad.push(c, snap);
        M.state.settings.sync.lastSyncAt = Date.now();
        // write merged data locally WITHOUT re-triggering a sync loop
        await M.Storage.writeAllSilently();
        setStatus('synced');
        if (M.App) M.App.refresh();
        return true;
      } catch (e) {
        setStatus(navigator.onLine ? 'error' : 'offline', e.message || 'unreachable');
        return false;
      } finally { running = false; }
    }
  };

  M.Sync = Sync;
})(window.MDT = window.MDT || {});
