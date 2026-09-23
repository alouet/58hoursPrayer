/* ==========================================================================
   vision.js — The Vision Account
   ---------------------------------------------------------------------------
   Money from the nations, in their own currencies, piling up as prayer time
   grows. Everything is derived from the time you have sown:

       vision value = total prayer time × (target amount ÷ target hours)

   so the balance rises only while you are with God, and in real time while
   the timer runs. Inflows (city, currency, kind, amount) are generated
   deterministically from each 5-minute block of prayer, so the feed is the
   same on every device and every reload.

   Exchange rates are fixed approximations used for the vision display only.
   Actual money you receive is recorded separately in the Real provision log.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const BLOCK = 5 * 60000;

  // Units of XAF (FCFA) per 1 unit of each currency — approximate, fixed.
  const FX = { XAF: 1, USD: 605, EUR: 655.957, GBP: 765, CAD: 445, AUD: 400, CHF: 690, JPY: 4.1, CNY: 84, INR: 7.3, SGD: 450, KRW: 0.45, AED: 165, SAR: 161, QAR: 166, NGN: 0.39, KES: 4.7, ZAR: 33, GHS: 41, BRL: 110, MXN: 33, COP: 0.15 };
  const SYM = { XAF: 'FCFA', USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', CHF: 'CHF', JPY: '¥', CNY: 'CN¥', INR: '₹', SGD: 'S$', KRW: '₩', AED: 'AED', SAR: 'SAR', QAR: 'QAR', NGN: '₦', KES: 'KSh', ZAR: 'R', GHS: 'GH₵', BRL: 'R$', MXN: 'MX$', COP: 'COL$' };
  const NAMES = { XAF: 'CFA franc', USD: 'US dollar', EUR: 'Euro', GBP: 'Pound sterling', CAD: 'Canadian dollar', AUD: 'Australian dollar', CHF: 'Swiss franc', JPY: 'Japanese yen', CNY: 'Chinese yuan', INR: 'Indian rupee', SGD: 'Singapore dollar', KRW: 'Korean won', AED: 'UAE dirham', SAR: 'Saudi riyal', QAR: 'Qatari riyal', NGN: 'Naira', KES: 'Kenyan shilling', ZAR: 'Rand', GHS: 'Cedi', BRL: 'Real', MXN: 'Mexican peso', COP: 'Colombian peso' };
  const NO_DECIMALS = { XAF: 1, JPY: 1, KRW: 1, COP: 1, NGN: 1, KES: 1 };

  const SOURCES = [
    { city: 'New York', cc: 'US', region: 'North America', cur: 'USD', lon: -74, lat: 40.7, w: 14 },
    { city: 'Los Angeles', cc: 'US', region: 'North America', cur: 'USD', lon: -118, lat: 34, w: 6 },
    { city: 'Toronto', cc: 'CA', region: 'North America', cur: 'CAD', lon: -79.4, lat: 43.7, w: 5 },
    { city: 'Mexico City', cc: 'MX', region: 'North America', cur: 'MXN', lon: -99.1, lat: 19.4, w: 2 },
    { city: 'São Paulo', cc: 'BR', region: 'South America', cur: 'BRL', lon: -46.6, lat: -23.5, w: 4 },
    { city: 'Bogotá', cc: 'CO', region: 'South America', cur: 'COP', lon: -74, lat: 4.7, w: 2 },
    { city: 'London', cc: 'GB', region: 'Europe', cur: 'GBP', lon: -0.1, lat: 51.5, w: 8 },
    { city: 'Paris', cc: 'FR', region: 'Europe', cur: 'EUR', lon: 2.35, lat: 48.9, w: 7 },
    { city: 'Berlin', cc: 'DE', region: 'Europe', cur: 'EUR', lon: 13.4, lat: 52.5, w: 5 },
    { city: 'Zurich', cc: 'CH', region: 'Europe', cur: 'CHF', lon: 8.5, lat: 47.4, w: 4 },
    { city: 'Dubai', cc: 'AE', region: 'Middle East', cur: 'AED', lon: 55.3, lat: 25.2, w: 6 },
    { city: 'Riyadh', cc: 'SA', region: 'Middle East', cur: 'SAR', lon: 46.7, lat: 24.7, w: 4 },
    { city: 'Doha', cc: 'QA', region: 'Middle East', cur: 'QAR', lon: 51.5, lat: 25.3, w: 3 },
    { city: 'Lagos', cc: 'NG', region: 'Africa', cur: 'NGN', lon: 3.4, lat: 6.5, w: 5 },
    { city: 'Nairobi', cc: 'KE', region: 'Africa', cur: 'KES', lon: 36.8, lat: -1.3, w: 3 },
    { city: 'Johannesburg', cc: 'ZA', region: 'Africa', cur: 'ZAR', lon: 28, lat: -26, w: 3 },
    { city: 'Accra', cc: 'GH', region: 'Africa', cur: 'GHS', lon: -0.2, lat: 5.6, w: 2 },
    { city: 'Douala', cc: 'CM', region: 'Africa', cur: 'XAF', lon: 9.7, lat: 4.05, w: 3 },
    { city: 'Mumbai', cc: 'IN', region: 'Asia', cur: 'INR', lon: 72.9, lat: 19.1, w: 4 },
    { city: 'Singapore', cc: 'SG', region: 'Asia', cur: 'SGD', lon: 103.8, lat: 1.35, w: 4 },
    { city: 'Tokyo', cc: 'JP', region: 'Asia', cur: 'JPY', lon: 139.7, lat: 35.7, w: 5 },
    { city: 'Seoul', cc: 'KR', region: 'Asia', cur: 'KRW', lon: 127, lat: 37.6, w: 3 },
    { city: 'Shanghai', cc: 'CN', region: 'Asia', cur: 'CNY', lon: 121.5, lat: 31.2, w: 5 },
    { city: 'Sydney', cc: 'AU', region: 'Oceania', cur: 'AUD', lon: 151, lat: -33.9, w: 3 }
  ];
  const KINDS = ['Client payment', 'Book royalty', 'Partnership', 'Program enrolment', 'Product sale', 'Investment return', 'Speaking fee', 'Licensing', 'Contract', 'Subscription', 'Gift', 'Sponsorship'];
  const SUM_W = SOURCES.reduce((a, s) => a + s.w, 0);

  function pickSource(r) { let x = r * SUM_W; for (const s of SOURCES) { x -= s.w; if (x <= 0) return s; } return SOURCES[0]; }

  const V = {
    FX, SYM, NAMES, SOURCES,
    cfg() { return M.state.settings.vision; },
    home() { const c = V.cfg().currency; return FX[c] ? c : 'XAF'; },
    targetHours() {
      const c = V.cfg(); if (+c.targetHours > 0) return +c.targetHours;
      const g = M.Goals.active(); return M.Goals.isTimeBased(g) ? +g.target : 58;
    },
    /** home-currency amount per millisecond of prayer */
    rate() { return (+V.cfg().target || 0) / (V.targetHours() * U.HOUR); },
    liveExtra() { return M.Timer.isActive ? M.Timer.elapsed() : 0; },
    totalMs(extra) { return M.Storage.getSessions().reduce((a, s) => a + s.durationMs, 0) + (extra == null ? V.liveExtra() : extra); },
    value(extra) { return V.totalMs(extra) * V.rate(); },
    convert(amount, from, to) { return amount * FX[from] / FX[to]; },

    /** "FCFA 523,456,789" · "$12.4K" · "₦4.2M" */
    fmt(amount, cur, compact) {
      cur = cur || V.home();
      const sym = SYM[cur] || cur;
      const sep = /[A-Za-z]$/.test(sym) ? ' ' : '';
      let num;
      const a = Math.abs(amount);
      if (compact && a >= 1000) {
        const [d, s] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : [1e3, 'K'];
        const v = a / d; num = (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$|(\.\d*?)0+$/, '$1') + s;
      } else {
        num = a.toLocaleString('en-US', { maximumFractionDigits: (NO_DECIMALS[cur] || a >= 1000) ? 0 : 2, minimumFractionDigits: 0 });
      }
      return (amount < 0 ? '−' : '') + sym + sep + num;
    },

    /** Per-currency totals: [{cur, amount, share, cities}] sorted by home value */
    breakdown(total) {
      const home = V.home(); const by = {};
      SOURCES.forEach((s) => {
        const homeAmt = total * s.w / SUM_W;
        const b = by[s.cur] = by[s.cur] || { cur: s.cur, amount: 0, homeAmt: 0, cities: [] };
        b.amount += V.convert(homeAmt, home, s.cur); b.homeAmt += homeAmt; b.cities.push(s.city);
      });
      return Object.values(by).sort((a, b) => b.homeAmt - a.homeAmt);
    },
    byRegion(total) {
      const out = {};
      SOURCES.forEach((s) => { out[s.region] = (out[s.region] || 0) + total * s.w / SUM_W; });
      return out;
    },

    /** Deterministic inflow for 5-minute block i */
    inflow(i, blockValue) {
      const r = U.rng(i * 7919 + 104729);
      const s = pickSource(r()); const kind = KINDS[Math.floor(r() * KINDS.length)];
      const mult = 0.35 + r() * 2.2;
      const homeAmt = blockValue * mult;
      return { i, source: s, kind, homeAmt, amount: V.convert(homeAmt, V.home(), s.cur) };
    },
    inflows(n = 12) {
      const total = V.totalMs(); const blocks = Math.floor(total / BLOCK);
      const bv = BLOCK * V.rate(); const out = [];
      for (let i = blocks - 1; i >= Math.max(0, blocks - n); i--) out.push(V.inflow(i, bv));
      return out;
    },
    /** A random live inflow for animations (amount ≈ what the last few seconds earned) */
    liveInflow(seconds = 6) {
      const s = pickSource(Math.random()); const kind = U.pick(KINDS);
      const homeAmt = seconds * 1000 * V.rate() * (0.5 + Math.random() * 1.5);
      return { source: s, kind, homeAmt, amount: V.convert(homeAmt, V.home(), s.cur) };
    },
    sessionValue(ms) { return ms * V.rate(); },

    /* ---------------- UI ---------------- */
    counterHTML(size = 'xl') {
      const v = V.value(); const home = V.home();
      const alt = home === 'USD' ? 'EUR' : 'USD';
      return `<div class="va-counter ${size}">
        <p class="va-amount tnum" data-vision-total>${U.esc(V.fmt(v, home))}</p>
        <p class="va-alt tnum"><span data-vision-alt="${alt}">≈ ${U.esc(V.fmt(V.convert(v, home, alt), alt))}</span> · <span data-vision-alt="EUR2">${U.esc(V.fmt(V.convert(v, home, home === 'EUR' ? 'GBP' : 'EUR'), home === 'EUR' ? 'GBP' : 'EUR'))}</span></p>
      </div>`;
    },
    rateLine() {
      return `<span class="tnum">${U.esc(V.fmt(V.rate() * U.HOUR, V.home(), true))}</span> per hour with God`;
    },
    feedHTML(n = 10) {
      const list = V.inflows(n);
      if (!list.length) return `<p class="muted small">Your first inflow arrives after 5 minutes of prayer.</p>`;
      return `<ol class="va-feed">${list.map((f) => `<li>
        <span class="va-cc">${f.source.cc}</span>
        <span class="va-from"><strong>${U.esc(f.source.city)}</strong><span class="muted small">${U.esc(f.kind)}</span></span>
        <span class="va-in tnum">+ ${U.esc(V.fmt(f.amount, f.source.cur, true))}</span></li>`).join('')}</ol>`;
    },
    currenciesHTML(limit = 0) {
      let list = V.breakdown(V.value());
      if (limit) list = list.slice(0, limit);
      return `<div class="va-curr">${list.map((b) => `<div class="va-cur"><span class="va-code">${b.cur}</span><span class="va-camt tnum" data-vision-cur="${b.cur}">${U.esc(V.fmt(b.amount, b.cur, true))}</span><span class="muted small">${U.esc(b.cities.join(' · '))}</span></div>`).join('')}</div>`;
    },
    /** Full panel for The Flow */
    panel() {
      return `<section class="panel va-panel" id="vision-account">
        <div class="row between center wrap gap">
          <div><p class="kind"><span class="pill vis">Vision account</span> <span class="muted">${U.esc(V.NAMES[V.home()])}</span></p>
          <h2 class="h2">From the nations, to your mission.</h2></div>
          <button class="btn sm ghost" data-va-settings>${U.icon('settings')} Vision settings</button>
        </div>
        ${V.counterHTML('xl')}
        <p class="va-rate muted">${V.rateLine()} · target ${U.esc(V.fmt(+V.cfg().target, V.home(), true))} at ${V.targetHours()} hours</p>
        <div class="va-live" aria-live="polite"></div>
        <div class="va-grid">
          <div><p class="label">Piling up in every currency</p>${V.currenciesHTML()}</div>
          <div><p class="label">Latest inflows</p>${V.feedHTML(10)}</div>
        </div>
        <p class="small muted va-note">Grows only with the time you spend with God. What actually arrives, you record under Real provision below.</p>
      </section>`;
    },
    widget() {
      return `<div class="row between center wrap gap"><p class="kind"><span class="pill vis">Vision account</span></p><button class="btn sm ghost" data-go="flow">Open</button></div>
        ${V.counterHTML('lg')}
        <p class="va-rate muted small">${V.rateLine()}</p>
        <div class="va-live" aria-live="polite"></div>
        ${V.currenciesHTML(6)}`;
    },

    /** live refresh of every counter on screen (called on each timer tick) */
    tick() {
      const els = document.querySelectorAll('[data-vision-total]'); if (!els.length) return;
      const v = V.value(); const home = V.home();
      els.forEach((n) => { n.textContent = V.fmt(v, home); });
      document.querySelectorAll('[data-vision-alt]').forEach((n) => {
        const alt = n.dataset.visionAlt === 'EUR2' ? (home === 'EUR' ? 'GBP' : 'EUR') : n.dataset.visionAlt;
        n.textContent = (n.dataset.visionAlt === 'EUR2' ? '' : '≈ ') + V.fmt(V.convert(v, home, alt), alt);
      });
      const b = V.breakdown(v);
      document.querySelectorAll('[data-vision-cur]').forEach((n) => { const x = b.find((y) => y.cur === n.dataset.visionCur); if (x) n.textContent = V.fmt(x.amount, x.cur, true); });
    },
    /** count-up animation when a counter first appears */
    countUp(root) {
      if (U.reducedMotion()) return;
      const els = (root || document).querySelectorAll('[data-vision-total]'); if (!els.length) return;
      const end = V.value(); const start = end * 0.9; const t0 = performance.now(); const home = V.home();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 1600); const e = 1 - Math.pow(1 - k, 3);
        els.forEach((n) => { if (n.isConnected) n.textContent = V.fmt(start + (V.value() - start) * e, home); });
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    /** floating "+ ₦2.4M · Lagos" chips while the timer runs */
    pop() {
      if (!M.Timer.isActive || M.Timer.isPaused || document.hidden) return;
      const hosts = Array.from(document.querySelectorAll('.va-live')).filter((h) => h.isConnected && h.getClientRects().length);
      if (!hosts.length) return;
      const f = V.liveInflow(150 + Math.random() * 250);
      hosts.forEach((h) => {
        const el = document.createElement('span');
        el.className = 'va-pop';
        el.innerHTML = `<b class="tnum">+ ${U.esc(V.fmt(f.amount, f.source.cur, true))}</b> ${U.esc(f.source.city)} · ${U.esc(f.kind)}`;
        h.appendChild(el);
        while (h.children.length > 3) h.firstChild.remove();
        setTimeout(() => el.remove(), 6000);
      });
    },

    editor() {
      const c = V.cfg();
      const m = U.modal(`<h3 class="modal-title">Vision account</h3>
        <p class="muted small">Set what you are believing for. The balance grows in proportion to your time with God.</p>
        <form class="form" id="va-form">
          <div class="grid2">
            <label class="field"><span>Home currency</span><select id="va-cur">${Object.keys(FX).map((k) => `<option value="${k}" ${k === V.home() ? 'selected' : ''}>${k} — ${NAMES[k]}</option>`).join('')}</select></label>
            <label class="field"><span>Target amount</span><input id="va-target" inputmode="numeric" value="${U.esc(Math.round(+c.target || 0))}"></label>
          </div>
          <div class="chip-row" aria-label="Quick targets">${[1e7, 1e8, 1e9, 1e10].map((v) => `<button type="button" class="chip sm" data-va-q="${v}">${V.fmt(v, V.home(), true)}</button>`).join('')}</div>
          <label class="field"><span>Reached after how many hours of prayer? (empty = your active journey)</span><input id="va-hours" type="number" min="1" value="${+c.targetHours || ''}" placeholder="${V.targetHours()}"></label>
          <label class="switch"><input type="checkbox" id="va-prayer" ${c.showInPrayer ? 'checked' : ''}><span class="track"></span><span>Show the vision account in the prayer room</span></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
        </form>`, { label: 'Vision account settings' });
      U.$$('[data-va-q]', m).forEach((b) => b.onclick = () => { U.$('#va-target', m).value = b.dataset.vaQ; });
      U.$('#va-form', m).onsubmit = (e) => {
        e.preventDefault();
        const target = +String(U.$('#va-target', m).value).replace(/[^\d.]/g, '');
        if (!(target > 0)) return U.toast('Enter a target amount.', 'warn');
        M.Storage.saveSettings({ vision: Object.assign({}, c, { currency: U.$('#va-cur', m).value, target, targetHours: +U.$('#va-hours', m).value || 0, showInPrayer: U.$('#va-prayer', m).checked }) });
        U.closeModal(); U.toast('Vision account updated.'); M.App.refresh();
      };
    },

    init() {
      M.Timer.subscribe((type) => { if (type === 'tick' || type === 'end' || type === 'restore') V.tick(); });
      setInterval(V.pop, 5500);
      U.on(document.body, 'click', '[data-va-settings]', () => V.editor());
    }
  };

  M.Vision = V;
})(window.MDT = window.MDT || {});
