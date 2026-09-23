/* ==========================================================================
   util.js — shared helpers: DOM, time formatting, dates, ids, toasts, modals
   Every module attaches to the single global namespace window.MDT so the
   project can run as separate files (PWA) or be inlined into one HTML file.
   ========================================================================== */
(function (M) {
  'use strict';

  const U = {};

  /* ---------- DOM ---------- */
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  U.on = (el, ev, sel, fn) => {
    // delegated listener: U.on(root, 'click', '[data-x]', handler)
    el.addEventListener(ev, (e) => {
      const t = e.target.closest(sel);
      if (t && el.contains(t)) fn(e, t);
    });
  };

  /* ---------- ids & misc ---------- */
  U.uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  /** Deterministic PRNG so the seed tree looks the same on every render */
  U.rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  U.reducedMotion = () => {
    const s = M.state && M.state.settings;
    if (s && s.motion === 'reduced') return true;
    if (s && s.motion === 'full') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /* ---------- time formatting ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  U.pad = pad;
  /** ms -> "HH:MM:SS" (hours may exceed 24) */
  U.hms = (ms) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(t / 3600)) + ':' + pad(Math.floor((t % 3600) / 60)) + ':' + pad(t % 60);
  };
  /** ms -> "21h 32m" / "37m" / "45s" */
  U.hm = (ms) => {
    const totalMin = Math.floor(Math.max(0, ms) / 60000);
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    if (h && m) return h + 'h ' + m + 'm';
    if (h) return h + 'h';
    if (m) return m + 'm';
    return ms >= 1000 ? Math.floor(ms / 1000) + 's' : '0h';
  };
  /** Natural phrase: "37 minutes", "1 hour 24 minutes" */
  U.phrase = (ms) => {
    const totalMin = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    const parts = [];
    if (h) parts.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m || !h) parts.push(m + (m === 1 ? ' minute' : ' minutes'));
    return parts.join(' ');
  };
  U.HOUR = 3600000;
  U.DAY = 86400000;

  /* ---------- dates (always local time) ---------- */
  U.dayKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  U.startOfDay = (ts) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  U.addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
  U.fmtDate = (ts, opts) => new Date(ts).toLocaleDateString(undefined, opts || { month: 'long', day: 'numeric' });
  U.fmtLongDate = (ts) => new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  U.fmtTime = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  U.toInputDate = (ts) => U.dayKey(ts);
  U.toInputTime = (ts) => U.fmtTime(ts);
  U.fromInputs = (date, time) => { const [y, mo, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return new Date(y, mo - 1, d, h, mi).getTime(); };
  U.greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.'; };

  /* ---------- toast ---------- */
  U.toast = (msg, kind = '') => {
    const host = U.$('#toasts'); if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.setAttribute('role', 'status');
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 3200);
  };

  /* ---------- modal (in-page; never uses alert/confirm/prompt) ---------- */
  let lastFocus = null;
  U.modal = (html, { onMount, wide = false, label = 'Dialog', dismissable = true } = {}) => {
    U.closeModal();
    lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.id = 'modal';
    wrap.innerHTML = '<div class="modal-scrim" data-close></div><div class="modal ' + (wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + U.esc(label) + '">' +
      (dismissable ? '<button class="icon-btn modal-x" data-close aria-label="Close">' + U.icon('x') + '</button>' : '') + html + '</div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));
    if (dismissable) wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) U.closeModal(); });
    const first = wrap.querySelector('input,textarea,select,button:not(.modal-x)');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
    if (onMount) onMount(wrap.querySelector('.modal'));
    return wrap.querySelector('.modal');
  };
  U.closeModal = () => {
    const m = U.$('#modal');
    if (m) { m.remove(); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  };
  /** In-page confirmation. Resolves true/false. */
  U.confirm = (title, body, { ok = 'Confirm', danger = false } = {}) => new Promise((res) => {
    const m = U.modal('<h3 class="modal-title">' + U.esc(title) + '</h3><p class="muted">' + U.esc(body) + '</p>' +
      '<div class="row end gap"><button class="btn ghost" data-no>Cancel</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-yes>' + U.esc(ok) + '</button></div>', { label: title });
    m.querySelector('[data-yes]').onclick = () => { U.closeModal(); res(true); };
    m.querySelector('[data-no]').onclick = () => { U.closeModal(); res(false); };
  });

  /* ---------- downloads (with clipboard fallback where downloads are blocked) ---------- */
  U.download = (filename, text, mime = 'application/json') => {
    // Sandboxed hosts (e.g. an embedded preview) block downloads: callers fall back to clipboard.
    if (document.documentElement.dataset.host === 'sandbox') return false;
    try {
      const blob = new Blob([text], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      return true;
    } catch (e) { return false; }
  };
  U.copy = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  };

  /* ---------- icons (inline, stroke-based, 24px grid) ---------- */
  const I = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    pray: '<path d="M12 3c-1.5 3-4 5.5-4 9a4 4 0 008 0c0-3.5-2.5-6-4-9z"/><path d="M12 21v-5"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 5v16"/><path d="M8 7h7"/>',
    flow: '<path d="M3 7c4 0 5 4 9 4s5-4 9-4"/><path d="M3 13c4 0 5 4 9 4s5-4 9-4"/>',
    journal: '<path d="M6 3h11a2 2 0 012 2v16H6a2 2 0 01-2-2V5a2 2 0 012-2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    mic: '<path d="M12 3v10"/><path d="M8 7v2a4 4 0 008 0V7"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/>',
    seed: '<path d="M12 21V11"/><path d="M12 13c-4 0-7-3-7-7 4 0 7 3 7 7z"/><path d="M12 11c0-4 3-7 7-7 0 4-3 7-7 7z"/>',
    star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M12 8c-2-4-6-4-6-1s6 1 6 1 6 2 6-1-4-3-6 1"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M8 4v16M16 4v16"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    up: '<path d="M5 15l7-7 7 7"/>',
    down: '<path d="M5 9l7 7 7-7"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 013-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 01-3 3H3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 3h16"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 010 6M19 6a8 8 0 010 12"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l4 6M21 9l-4 6"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    minimize: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>',
    cloud: '<path d="M7 18a5 5 0 01-.6-10A6 6 0 0118 9a4.5 4.5 0 01-1 9z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    flame: '<path d="M12 3c0 4-5 6-5 11a5 5 0 0010 0c0-3-2-4-2-7-2 1-3 3-3 3s1-4 0-7z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z"/>',
    hands: '<path d="M7 21v-6l-3-5 2-1 3 4V5a1.5 1.5 0 013 0v7"/><path d="M17 21v-6l3-5-2-1-3 4V5a1.5 1.5 0 00-3 0"/>',
    ear: '<path d="M7 9a5 5 0 0110 0c0 3-3 4-3 7a3 3 0 01-6 0"/><path d="M10 10a2 2 0 014 0"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    silence: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8M9 18h6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
    drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/>',
    family: '<circle cx="7" cy="6" r="2.2"/><circle cx="17" cy="6" r="2.2"/><circle cx="12" cy="11" r="1.8"/><path d="M3 21v-6a4 4 0 018 0M13 21v-6a4 4 0 018 0"/><path d="M9.5 21v-3a2.5 2.5 0 015 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plane: '<path d="M2 13l20-8-6 16-4-6z"/><path d="M12 15l4-6"/>',
    dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><rect x="4" y="4" width="12" height="12" rx="2"/>'
  };
  U.icon = (name, cls = '') => '<svg class="ic ' + cls + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (I[name] || I.star) + '</svg>';

  M.U = U;
})(window.MDT = window.MDT || {});
