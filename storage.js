/* ==========================================================================
   storage.js — StorageService: local-first persistence
   ---------------------------------------------------------------------------
   • Primary store: IndexedDB (database "mdt", object store "kv").
   • Mirror: localStorage — written synchronously so data survives even if the
     page is killed before an async IndexedDB transaction completes.
   • Fallback: in-memory only (private windows / blocked storage). The UI
     warns the user when this happens.
   • Record collections use soft deletes (tombstones: deleted:true) and an
     updatedAt stamp on every record so a cloud adapter can merge safely.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const DB_NAME = 'mdt';
  const STORE = 'kv';
  const LS_PREFIX = 'mdt.v1.';
  const COLLECTIONS = ['goals', 'sessions', 'journal', 'testimonies', 'provisions'];
  const DOCS = ['settings', 'declarations', 'scripture', 'achievements', 'meta'];
  const KEYS = COLLECTIONS.concat(DOCS);

  let db = null;
  let backend = 'memory';
  const listeners = [];
  const pending = new Set();
  let flushTimer = null;

  /* ---------- low-level IndexedDB ---------- */
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no-idb'));
      let req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { return reject(e); }
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      setTimeout(() => reject(new Error('idb-timeout')), 2500);
    });
  }
  function idbGet(key) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readonly');
        const r = tx.objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(undefined);
      } catch (e) { resolve(undefined); }
    });
  }
  function idbPut(key, val) {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }
  function lsGet(key) { try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }
  function lsSet(key, val) { try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); return true; } catch (e) { return false; } }
  function lsDel(key) { try { localStorage.removeItem(LS_PREFIX + key); } catch (e) { /* ignore */ } }

  /* ---------- defaults ---------- */
  function defaultGoal() {
    const now = Date.now();
    return {
      id: 'goal_58', name: '58 Hours With God', unit: 'hours', target: 58, customUnit: '',
      purpose: 'Seeking wisdom and pursuing God’s will.', startDate: U.dayKey(now), targetDate: '',
      dailyTargetMin: 120, scripture: 'Proverbs 4:7', theme: 'Wisdom', color: '',
      status: 'active', createdAt: now, updatedAt: now
    };
  }
  function defaults() {
    return {
      goals: [defaultGoal()], sessions: [], journal: [], testimonies: [], provisions: [],
      settings: {
        updatedAt: 0, mode: 'dark', theme: 'gold', customAccent: '', motion: 'auto',
        dailyTargetMin: 120, windows: ['06:00', '21:00'], sound: 'silent', volume: 0.5,
        keepAwake: true, openingExperience: true, prompts: true, background: 'night',
        reminders: { enabled: false, times: ['06:00', '20:00'], days: [0, 1, 2, 3, 4, 5, 6] },
        pinHash: '', pinSalt: '', lockAfterMin: 5,
        sync: { adapter: 'none', endpoint: '', token: '', lastSyncAt: 0 },
        missionLabel: 'Yaoundé — your mission',
        fontDisplay: 'Cormorant Garamond', fontUI: 'Manrope', fontNum: 'same', fontScale: 1,
        vision: { currency: 'XAF', target: 1000000000, targetHours: 0, showInPrayer: true }
      },
      declarations: { updatedAt: 0, favorites: [], custom: [], done: {}, index: 0 },
      scripture: { updatedAt: 0, favorites: [] },
      achievements: { updatedAt: 0, unlocked: {} },
      meta: { updatedAt: 0, lastOpenDay: '', milestones: {}, completedGoals: {}, widgetOrder: null, installedAt: Date.now() }
    };
  }

  /** Normalize/repair data so a corrupted field never breaks the UI. */
  function sanitize(data) {
    const d = defaults();
    const out = {};
    COLLECTIONS.forEach((k) => {
      const arr = Array.isArray(data[k]) ? data[k] : d[k];
      out[k] = arr.filter((r) => r && typeof r === 'object' && typeof r.id === 'string');
    });
    // sessions must have numeric start/duration
    out.sessions = out.sessions.filter((s) => s.deleted || (Number.isFinite(s.start) && Number.isFinite(s.durationMs) && s.durationMs >= 0));
    DOCS.forEach((k) => {
      const v = data[k] && typeof data[k] === 'object' ? data[k] : {};
      out[k] = Object.assign({}, d[k], v);
    });
    out.settings.reminders = Object.assign({}, d.settings.reminders, out.settings.reminders || {});
    out.settings.sync = Object.assign({}, d.settings.sync, out.settings.sync || {});
    out.settings.vision = Object.assign({}, d.settings.vision, out.settings.vision || {});
    if (!out.goals.some((g) => !g.deleted)) out.goals.push(defaultGoal());
    if (!out.goals.some((g) => !g.deleted && g.status === 'active')) {
      const g = out.goals.find((x) => !x.deleted && x.status !== 'archived') || out.goals.find((x) => !x.deleted);
      g.status = 'active';
    }
    return out;
  }

  /* ---------- public service ---------- */
  const StorageService = {
    KEYS, COLLECTIONS, DOCS, defaults,
    get backend() { return backend; },

    /** Load everything. Returns sanitized state object. */
    async init() {
      const raw = {};
      try { db = await openDB(); backend = 'indexeddb'; } catch (e) { db = null; }
      let lsOk = false;
      try { localStorage.setItem(LS_PREFIX + '_probe', '1'); localStorage.removeItem(LS_PREFIX + '_probe'); lsOk = true; } catch (e) { /* ignore */ }
      if (!db && lsOk) backend = 'localStorage';
      for (const k of KEYS) {
        let a = db ? await idbGet(k) : undefined;
        const b = lsOk ? lsGet(k) : undefined;
        // choose the most recently saved copy
        const pickB = b && (!a || (b.savedAt || 0) > (a.savedAt || 0));
        const chosen = pickB ? b : a;
        if (chosen && chosen.data !== undefined) raw[k] = chosen.data;
      }
      return sanitize(raw);
    },

    /** Queue a key to be written (debounced) — call after mutating M.state */
    persist(key, immediate = false) {
      pending.add(key);
      // synchronous mirror first: survives abrupt termination
      const wrapped = { savedAt: Date.now(), data: M.state[key] };
      const ok = lsSet(key, wrapped);
      if (!ok && backend === 'localStorage') M.U.toast('Storage is full or blocked — export a backup soon.', 'warn');
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => StorageService.flush(), immediate ? 0 : 250);
      listeners.forEach((fn) => { try { fn(key); } catch (e) { console.warn(e); } });
    },
    async flush() {
      if (!db) { pending.clear(); return; }
      const keys = Array.from(pending); pending.clear();
      for (const k of keys) await idbPut(k, { savedAt: Date.now(), data: M.state[k] });
    },
    /** Write every key to both stores without notifying listeners (used after sync merge) */
    async writeAllSilently() {
      KEYS.forEach((k) => lsSet(k, { savedAt: Date.now(), data: M.state[k] }));
      if (db) for (const k of KEYS) await idbPut(k, { savedAt: Date.now(), data: M.state[k] });
    },
    onChange(fn) { listeners.push(fn); },

    /* ----- record helpers ----- */
    live(coll) { return (M.state[coll] || []).filter((r) => !r.deleted); },
    upsert(coll, rec) {
      rec.updatedAt = Date.now();
      const arr = M.state[coll];
      const i = arr.findIndex((r) => r.id === rec.id);
      if (i >= 0) arr[i] = Object.assign({}, arr[i], rec); else arr.push(rec);
      this.persist(coll);
      return rec;
    },
    remove(coll, id) {
      const r = M.state[coll].find((x) => x.id === id);
      if (r) { r.deleted = true; r.updatedAt = Date.now(); this.persist(coll); }
    },
    touch(doc) { M.state[doc].updatedAt = Date.now(); this.persist(doc); },

    /* ----- named API (as specified) ----- */
    saveSession(s) { return this.upsert('sessions', s); },
    getSessions(goalId) { const all = this.live('sessions').sort((a, b) => a.start - b.start); return goalId ? all.filter((s) => s.goalId === goalId) : all; },
    deleteSession(id) { this.remove('sessions', id); },
    saveGoal(g) { return this.upsert('goals', g); },
    getGoal(id) { return this.live('goals').find((g) => g.id === id); },
    getGoals() { return this.live('goals'); },
    saveSettings(patch) { Object.assign(M.state.settings, patch || {}); this.touch('settings'); return M.state.settings; },
    getSettings() { return M.state.settings; },
    saveJournalEntry(e) { return this.upsert('journal', e); },
    getJournal() { return this.live('journal').sort((a, b) => b.createdAt - a.createdAt); },
    sync() { return M.Sync ? M.Sync.syncNow() : Promise.resolve(); },

    /** Full backup object */
    exportData() {
      const out = { app: 'money-doesnt-deserve-my-time', version: 1, exportedAt: new Date().toISOString() };
      KEYS.forEach((k) => { out[k] = M.state[k]; });
      if (M.Analytics) out.statistics = M.Analytics.summary();
      // never export the PIN hash
      out.settings = Object.assign({}, out.settings, { pinHash: '', pinSalt: '', sync: Object.assign({}, out.settings.sync, { token: '' }) });
      return out;
    },
    /** Validate + import. mode: 'replace' | 'merge'. Throws on invalid data. */
    importData(obj, mode = 'merge') {
      if (!obj || typeof obj !== 'object' || !Array.isArray(obj.sessions) || !Array.isArray(obj.goals)) {
        throw new Error('This file is not a valid backup (sessions and goals are missing).');
      }
      const incoming = sanitize(obj);
      if (mode === 'replace') {
        const keepPin = { pinHash: M.state.settings.pinHash, pinSalt: M.state.settings.pinSalt };
        KEYS.forEach((k) => { M.state[k] = incoming[k]; });
        Object.assign(M.state.settings, keepPin);
      } else {
        COLLECTIONS.forEach((k) => { M.state[k] = mergeRecords(M.state[k], incoming[k]); });
        DOCS.forEach((k) => { if ((incoming[k].updatedAt || 0) > (M.state[k].updatedAt || 0) && k !== 'settings') M.state[k] = incoming[k]; });
      }
      M.state = sanitize(M.state);
      KEYS.forEach((k) => this.persist(k, true));
    },
    async deleteAll() {
      KEYS.forEach((k) => lsDel(k));
      lsDel('active');
      if (db) { for (const k of KEYS) await idbPut(k, undefined); }
      M.state = sanitize({});
    },

    /* active timer session is stored separately & synchronously */
    saveActive(a) { if (a) lsSet('active', a); else lsDel('active'); if (db) idbPut('active', a || null); },
    async loadActive() {
      const a = lsGet('active');
      if (a) return a;
      if (db) { const b = await idbGet('active'); return b || null; }
      return null;
    },
    sanitize, mergeRecords
  };

  /** Merge two record arrays, newest updatedAt wins per id. */
  function mergeRecords(a, b) {
    const map = new Map();
    (a || []).forEach((r) => map.set(r.id, r));
    (b || []).forEach((r) => { const cur = map.get(r.id); if (!cur || (r.updatedAt || 0) > (cur.updatedAt || 0)) map.set(r.id, r); });
    return Array.from(map.values());
  }

  M.Storage = StorageService;
})(window.MDT = window.MDT || {});
