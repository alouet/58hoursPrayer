/* ==========================================================================
   app.js — boot, router, navigation, Dashboard, Today, Seed Journey, The Flow,
   and the daily opening experience.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const ROUTES = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'today', label: 'Today', icon: 'sun' },
    { id: 'pray', label: 'Prayer', icon: 'pray' },
    { id: 'scripture', label: 'Scripture', icon: 'book' },
    { id: 'declarations', label: 'Declarations', icon: 'mic' },
    { id: 'seed', label: 'Seed Journey', icon: 'seed' },
    { id: 'flow', label: 'The Flow', icon: 'flow' },
    { id: 'journal', label: 'Journal', icon: 'journal' },
    { id: 'testimonies', label: 'Testimonies', icon: 'gift' },
    { id: 'achievements', label: 'Achievements', icon: 'trophy' },
    { id: 'analytics', label: 'Analytics', icon: 'chart' },
    { id: 'goals', label: 'Goals', icon: 'target' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  const MOBILE = [['dashboard', 'Home', 'home'], ['pray', 'Pray', 'pray'], ['scripture', 'Scripture', 'book'], ['flow', 'Flow', 'flow'], ['journal', 'Journal', 'journal']];

  const WIDGETS = {
    progress: { name: 'Progress', size: 'full' }, timer: { name: 'Timer', size: 'half' }, today: { name: 'Today’s target', size: 'half' },
    tree: { name: 'Seed tree', size: 'half' }, streak: { name: 'Current streak', size: 'half' }, scripture: { name: 'Scripture', size: 'half' },
    declaration: { name: 'Declaration', size: 'half' }, flow: { name: 'Flow visualization', size: 'full' }, recent: { name: 'Recent sessions', size: 'half' },
    achievements: { name: 'Achievements', size: 'half' }, journal: { name: 'Journal', size: 'half' }, estimate: { name: 'Completion estimate', size: 'half' },
    vision: { name: 'Vision account', size: 'full' }
  };
  const DEFAULT_ORDER = ['progress', 'vision', 'timer', 'today', 'tree', 'scripture', 'declaration', 'estimate', 'streak', 'flow', 'recent', 'achievements', 'journal'];

  let current = 'dashboard';
  let arranging = false;

  const App = {
    ROUTES,
    get route() { return current; },

    /* ---------------- boot ---------------- */
    async boot() {
      try {
        M.state = await M.Storage.init();
      } catch (e) {
        console.error(e);
        M.state = M.Storage.sanitize({});
        U.toast('Storage is unavailable — changes will last only until you close this page. Export a backup.', 'warn');
      }
      M.Settings.apply();
      M.Viz.refreshColors();
      App.shell();
      M.Scripture.bind();
      M.Vision.init();
      M.Prayer.bind();
      M.Sync.init();
      M.Notifications.init();
      M.PWA.init();
      await M.Timer.restore();
      M.Achievements.check(true);
      window.addEventListener('hashchange', () => App.go(location.hash.slice(1) || 'dashboard', false));
      const initial = (location.hash || '').slice(1);
      App.go(ROUTES.some((r) => r.id === initial) ? initial : 'dashboard', false);
      M.Settings.initLock();
      if (M.Timer.isActive) { U.toast('Your session was restored. The timer kept counting.'); }
      else App.maybeOpening();
      if (M.Storage.backend === 'memory') U.toast('This browser is not keeping data. Export a backup before closing.', 'warn');
      if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => M.Settings.apply());
      document.documentElement.classList.add('ready');
    },

    shell() {
      const nav = U.$('#sidenav');
      nav.innerHTML = ROUTES.map((r) => `<a href="#${r.id}" class="nav-item" data-route="${r.id}">${U.icon(r.icon)}<span>${r.label}</span></a>`).join('');
      U.$('#bottomnav').innerHTML = MOBILE.map(([id, l, ic]) => `<a href="#${id}" class="bn-item" data-route="${id}">${U.icon(ic)}<span>${l}</span></a>`).join('');
      U.$('#drawer-nav').innerHTML = ROUTES.map((r) => `<a href="#${r.id}" class="nav-item" data-route="${r.id}">${U.icon(r.icon)}<span>${r.label}</span></a>`).join('');
      U.$('#menu-btn').onclick = () => App.drawer(true);
      U.$$('[data-drawer-close]').forEach((b) => b.onclick = () => App.drawer(false));
      U.$('#drawer').addEventListener('click', (e) => { if (e.target.closest('a')) App.drawer(false); });
      U.$('#mode-btn').onclick = () => {
        const s = M.state.settings; const dark = document.documentElement.dataset.mode === 'dark' || (!document.documentElement.dataset.mode && window.matchMedia('(prefers-color-scheme: dark)').matches);
        M.Storage.saveSettings({ mode: dark ? 'light' : 'dark' }); M.Settings.apply(); App.modeIcon();
        if (s.mode) App.refresh();
      };
      App.modeIcon();
      U.$('#sync-status').onclick = () => App.go('settings');
      const pill = U.$('#live-pill');
      pill.onclick = () => M.Prayer.openFocus();
      pill.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); M.Prayer.openFocus(); } };
      M.Timer.subscribe((type) => { if (type === 'tick') App.liveTick(); });
    },
    modeIcon() { const b = U.$('#mode-btn'); const m = M.state.settings.mode; b.innerHTML = U.icon(m === 'light' ? 'moon' : 'sun'); b.setAttribute('aria-label', m === 'light' ? 'Switch to dark mode' : 'Switch to light mode'); },
    drawer(open) { const d = U.$('#drawer'); d.hidden = !open; document.body.classList.toggle('drawer-open', open); if (open) U.$('#drawer .nav-item').focus(); },

    go(id, push = true) {
      if (!ROUTES.some((r) => r.id === id)) id = 'dashboard';
      current = id;
      if (push && location.hash.slice(1) !== id) { try { history.pushState(null, '', '#' + id); } catch (e) { location.hash = id; } }
      U.$$('[data-route]').forEach((a) => { const on = a.dataset.route === id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      App.render(true);
    },
    refresh() { App.render(false); M.Prayer.updateLivePill(); },
    render(scrollTop) {
      const root = U.$('#view');
      const y = window.scrollY;
      try {
        ({
          dashboard: App.dashboard, today: App.today, pray: M.Prayer.render, scripture: M.Scripture.render, declarations: M.Declarations.render,
          seed: App.seed, flow: App.flow, journal: M.Journal.render, testimonies: M.Journal.renderTestimonies, achievements: M.Achievements.render,
          analytics: M.Analytics.render, goals: M.Goals.render, settings: M.Settings.render
        }[current])(root);
      } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="empty"><p class="empty-title">This screen could not load.</p><p class="muted">Your prayer history is safe. Try another section, or export a backup from Settings.</p></div>`;
      }
      root.classList.remove('enter'); void root.offsetWidth; if (scrollTop) root.classList.add('enter');
      if (scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
      const r = ROUTES.find((x) => x.id === current);
      document.title = (current === 'dashboard' ? '' : r.label + ' · ') + 'Money Doesn’t Deserve My Time';
      const h = U.$('#goal-chip'); if (h) h.textContent = M.Goals.active().name;
    },

    /** live numbers while a session runs */
    liveTick() {
      const a = M.Timer.active; if (!a) return;
      const g = M.Goals.active(); if (a.goalId !== g.id) return;
      const el = M.Timer.elapsed();
      const p = M.Goals.progress(g, el);
      U.$$('[data-hero-done]').forEach((n) => { n.textContent = M.Goals.isTimeBased(g) ? U.hms(p.doneMs) : M.Goals.fmtValue(p); });
      U.$$('[data-hero-rem]').forEach((n) => { n.textContent = M.Goals.isTimeBased(g) ? U.hms(p.remainingMs) : M.Goals.fmtRemaining(p); });
      U.$$('[data-hero-pct]').forEach((n) => { n.textContent = Math.floor(p.pct * 100) + '%'; });
      U.$$('[data-hero-ring] .ring-fill').forEach((c) => { const L = +c.getAttribute('stroke-dasharray'); c.setAttribute('stroke-dashoffset', L * (1 - p.pct)); });
      U.$$('[data-hero-bar]').forEach((b) => { b.style.width = (p.pct * 100) + '%'; });
      const tMs = M.Analytics.todayMs(el), tgt = M.Goals.dailyTargetMs(g);
      U.$$('[data-today-done]').forEach((n) => { n.textContent = U.hm(tMs); });
      U.$$('[data-today-rem]').forEach((n) => { n.textContent = tMs >= tgt ? 'Target reached' : U.hm(tgt - tMs); });
    },

    /* ---------------- dashboard ---------------- */
    order() {
      const saved = M.state.meta.widgetOrder;
      let list = Array.isArray(saved) ? saved.filter((w) => WIDGETS[w.id]) : [];
      DEFAULT_ORDER.forEach((id, i) => { if (!list.some((w) => w.id === id)) list.splice(Math.min(i, list.length), 0, { id, hidden: false }); });
      return list;
    },
    dashboard(root) {
      const order = App.order();
      const g = M.Goals.active();
      root.innerHTML = `
        <div class="dash-top row between center wrap gap">
          <p class="eyebrow">${U.esc(U.fmtLongDate(Date.now()))}</p>
          <button class="btn sm ghost" data-arrange aria-pressed="${arranging}">${U.icon('grid')} ${arranging ? 'Done arranging' : 'Arrange'}</button>
        </div>
        <div class="widgets ${arranging ? 'arranging' : ''}">
          ${order.filter((w) => arranging || !w.hidden).map((w, i) => `<section class="widget w-${w.id} ${WIDGETS[w.id].size} ${w.hidden ? 'is-hidden' : ''}" data-w="${w.id}" ${arranging ? 'draggable="true"' : ''}>
            ${arranging ? `<div class="w-arrange"><span class="w-name">${U.icon('drag')} ${WIDGETS[w.id].name}</span><span class="row gap-s">
              <button class="icon-btn sm" data-wmove="-1" data-id="${w.id}" aria-label="Move ${WIDGETS[w.id].name} up" ${i === 0 ? 'disabled' : ''}>${U.icon('up')}</button>
              <button class="icon-btn sm" data-wmove="1" data-id="${w.id}" aria-label="Move ${WIDGETS[w.id].name} down">${U.icon('down')}</button>
              <button class="icon-btn sm" data-whide data-id="${w.id}" aria-label="${w.hidden ? 'Show' : 'Hide'} ${WIDGETS[w.id].name}">${U.icon(w.hidden ? 'eye' : 'x')}</button></span></div>` : ''}
            ${App.widget(w.id, g)}</section>`).join('')}
        </div>`;
      // mount canvases
      const tree = U.$('.w-tree canvas', root);
      if (tree) M.Viz.mountTree(tree, () => M.Goals.progress(g, M.Timer.isActive ? M.Timer.elapsed() : 0).pct);
      const fl = U.$('.w-flow canvas', root);
      if (fl) M.Viz.mountFlowMap(fl, () => 0.25 + 0.75 * M.Goals.progress(g).pct);
      // handlers
      U.$('[data-arrange]', root).onclick = () => { arranging = !arranging; App.dashboard(root); };
      U.$$('[data-wmove]', root).forEach((b) => b.onclick = () => App.moveWidget(b.dataset.id, +b.dataset.wmove, root));
      U.$$('[data-whide]', root).forEach((b) => b.onclick = () => { const o = App.order(); const w = o.find((x) => x.id === b.dataset.id); w.hidden = !w.hidden; M.state.meta.widgetOrder = o; M.Storage.touch('meta'); App.dashboard(root); });
      if (arranging) App.dragSort(root);
      U.$$('[data-start-quick]', root).forEach((b) => b.onclick = () => M.Prayer.start({ mode: b.dataset.startQuick || 'pray' }));
      U.$$('[data-go]', root).forEach((b) => b.onclick = () => App.go(b.dataset.go));
      U.$$('[data-open-focus]', root).forEach((b) => b.onclick = () => M.Prayer.openFocus());
      const dr = U.$('[data-reveal]', root); if (dr) dr.onclick = () => { dr.classList.add('revealed'); dr.setAttribute('aria-expanded', 'true'); };
      U.$$('[data-vision]', root).forEach((b) => b.onclick = () => M.Viz.openVision());
      U.$$('[data-globe]', root).forEach((b) => b.onclick = () => M.Viz.openGlobalFlow());
      M.Vision.countUp(root);
    },
    moveWidget(id, dir, root) {
      const o = App.order(); const i = o.findIndex((w) => w.id === id); const j = i + dir;
      if (j < 0 || j >= o.length) return;
      [o[i], o[j]] = [o[j], o[i]]; M.state.meta.widgetOrder = o; M.Storage.touch('meta'); App.dashboard(root);
      const b = U.$('[data-wmove="' + dir + '"][data-id="' + id + '"]', root); if (b && !b.disabled) b.focus();
    },
    dragSort(root) {
      let dragId = null;
      U.$$('[data-w]', root).forEach((el) => {
        el.addEventListener('dragstart', (e) => { dragId = el.dataset.w; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (x) { /* ignore */ } });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
        el.addEventListener('dragleave', () => el.classList.remove('drop'));
        el.addEventListener('drop', (e) => {
          e.preventDefault(); el.classList.remove('drop');
          const o = App.order(); const from = o.findIndex((w) => w.id === dragId); const to = o.findIndex((w) => w.id === el.dataset.w);
          if (from < 0 || to < 0 || from === to) return;
          const [w] = o.splice(from, 1); o.splice(to, 0, w); M.state.meta.widgetOrder = o; M.Storage.touch('meta'); App.dashboard(root);
        });
      });
    },

    widget(id, g) {
      const p = M.Goals.progress(g, M.Timer.isActive && M.Timer.active.goalId === g.id ? M.Timer.elapsed() : 0);
      const tb = M.Goals.isTimeBased(g);
      const st = M.Analytics.stats();
      switch (id) {
        case 'progress': {
          const verbs = tb ? 'completed' : 'done';
          return `<div class="hero">
            <div class="hero-copy">
              <p class="eyebrow accent-text">Your journey</p>
              <h1 class="hero-title">${U.esc(g.name)}</h1>
              <p class="hero-sub">I am not sowing hours. I am sowing seeds.</p>
              <div class="hero-total"><span class="tnum">${tb ? U.hms(p.targetMs) : g.target + ' ' + U.esc(M.Goals.unitLabel(g))}</span><span class="label">Total goal</span></div>
              <div class="hero-pair">
                <div><span class="tnum" data-hero-done>${tb ? U.hms(p.doneMs) : U.esc(M.Goals.fmtValue(p))}</span><span class="label">${verbs}</span></div>
                <div><span class="tnum" data-hero-rem>${tb ? U.hms(p.remainingMs) : U.esc(M.Goals.fmtRemaining(p))}</span><span class="label">remaining</span></div>
              </div>
              <div class="bar lg" role="progressbar" aria-label="Journey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(p.pct * 100)}"><span data-hero-bar style="width:${p.pct * 100}%"></span></div>
              <div class="row gap wrap">
                ${M.Timer.isActive ? `<button class="btn primary lg" data-open-focus>${U.icon('pray')} Return to prayer</button>` : `<button class="btn primary lg" data-start-quick="pray">${U.icon('play')} Start prayer</button>`}
                <button class="btn ghost lg" data-go="seed">View journey</button>
              </div>
            </div>
            <div class="hero-ring" data-hero-ring>
              ${M.Analytics.ring(p.pct, 240, 9, Math.floor(p.pct * 100) + '% of ' + g.name)}
              <div class="ring-center"><span class="ring-pct tnum" data-hero-pct>${Math.floor(p.pct * 100)}%</span><span class="label">complete</span></div>
            </div>
          </div>
          <div class="stat-strip hero-stats">
            <div class="stat"><p class="stat-k">${tb ? 'Hours sown' : 'Sown'}</p><p class="stat-v tnum">${U.esc(M.Goals.fmtValue(p))}</p></div>
            <div class="stat"><p class="stat-k">${tb ? 'Hours remaining' : 'Remaining'}</p><p class="stat-v tnum">${U.esc(M.Goals.fmtRemaining(p))}</p></div>
            <div class="stat"><p class="stat-k">Sessions</p><p class="stat-v tnum">${p.sessions}</p></div>
            <div class="stat"><p class="stat-k">Current streak</p><p class="stat-v tnum">${st.currentStreak} ${st.currentStreak === 1 ? 'day' : 'days'}</p></div>
          </div>
          <p class="motto">Money doesn’t deserve my time. <span class="accent-text">God’s will does.</span></p>`;
        }
        case 'timer':
          if (M.Timer.isActive) return `<p class="w-k">Prayer session</p><p class="w-big tnum" data-live-time>${U.hms(M.Timer.elapsed())}</p><p class="muted">${M.Timer.isPaused ? 'Paused' : 'You are sowing.'}</p><button class="btn primary" data-open-focus>Return to the prayer room</button>`;
          return `<p class="w-k">Prayer</p><p class="w-lede">Plant today’s seed.</p>
            <div class="quick-modes">${['pray', 'scripture', 'declare', 'listen'].map((m) => `<button class="chip" data-start-quick="${m}">${U.icon(M.Prayer.mode(m).icon)} ${M.Prayer.modeLabel(m)}</button>`).join('')}</div>
            <button class="btn primary" data-start-quick="pray">${U.icon('play')} Start prayer</button>`;
        case 'today': {
          const tgt = M.Goals.dailyTargetMs(g); const tMs = M.Analytics.todayMs(M.Timer.isActive ? M.Timer.elapsed() : 0);
          return `<p class="w-k">Today’s target</p>
            <div class="today-mini"><div class="ring-sm">${M.Analytics.ring(tMs / tgt, 104, 7, 'Today ' + Math.round(tMs / tgt * 100) + '%')}<span class="tnum">${Math.min(100, Math.round(tMs / tgt * 100))}%</span></div>
            <dl class="kv"><div><dt>Target</dt><dd class="tnum">${U.hm(tgt)}</dd></div><div><dt>Completed</dt><dd class="tnum" data-today-done>${U.hm(tMs)}</dd></div><div><dt>Remaining</dt><dd class="tnum" data-today-rem>${tMs >= tgt ? 'Target reached' : U.hm(tgt - tMs)}</dd></div></dl></div>
            <button class="btn sm ghost" data-go="today">Open today</button>`;
        }
        case 'tree': {
          const s = M.Viz.stage(p.pct);
          return `<p class="w-k">Your faith journey</p><canvas class="tree-canvas" role="img" aria-label="Seed tree at stage ${s.name}"></canvas>
            <div class="row between center"><p><strong>${s.name}</strong> <span class="muted small">· stage ${s.index + 1} of 7</span></p><button class="btn sm ghost" data-go="seed">Open</button></div>`;
        }
        case 'streak': {
          const days = Array.from({ length: 14 }, (_, i) => U.addDays(U.startOfDay(Date.now()), i - 13));
          const totals = M.Analytics.dayTotals(M.Storage.getSessions());
          return `<p class="w-k">Current streak</p><p class="w-big tnum">${st.currentStreak} <small>${st.currentStreak === 1 ? 'day' : 'days'}</small></p>
            <div class="streak-dots" aria-label="Last 14 days">${days.map((d) => `<span class="${totals.get(U.dayKey(d)) ? 'on' : ''}" title="${U.fmtDate(d)}"></span>`).join('')}</div>
            <p class="muted small">Best: ${st.bestStreak} ${st.bestStreak === 1 ? 'day' : 'days'} · ${U.esc(M.Declarations.encouragement())}</p>`;
        }
        case 'scripture': return M.Scripture.card(M.Scripture.today(), { compact: true });
        case 'declaration': {
          const d = M.Declarations.today();
          return `<p class="kind">Today’s declaration · ${M.Declarations.number(d)}</p>
            <button class="reveal" data-reveal aria-expanded="false"><span class="declaration-line">“${U.esc(d.text)}”</span><span class="tap-hint">Tap to reveal</span></button>
            <button class="btn sm ghost" data-go="declarations">Declare</button>`;
        }
        case 'flow':
          return `<div class="row between center wrap gap"><div><p class="kind"><span class="pill vis">Faith visualization</span></p><h2 class="h3">The Flow</h2><p class="muted small">Visualize your mission reaching nations and creating value around the world.</p></div>
            <div class="row gap-s wrap"><button class="btn sm ghost" data-globe>${U.icon('globe')} Global flow</button><button class="btn sm ghost" data-vision>${U.icon('eye')} Vision mode</button></div></div>
            <canvas class="map-canvas" aria-label="Faith visualization: streams of light flowing from the nations toward your mission"></canvas>`;
        case 'recent':
          return `<div class="row between center"><p class="w-k">Recent sessions</p><button class="btn sm ghost" data-go="pray">All</button></div>${M.Prayer.timeline(M.Storage.getSessions().slice().reverse(), { limit: 5, compact: true })}`;
        case 'achievements': {
          const u = M.state.achievements.unlocked;
          const earned = M.Achievements.DEFS.filter((d) => u[d.id]).sort((a, b) => u[b.id] - u[a.id]);
          const next = M.Achievements.DEFS.find((d) => !u[d.id]);
          return `<div class="row between center"><p class="w-k">Achievements</p><button class="btn sm ghost" data-go="achievements">All</button></div>
            ${earned.length ? `<div class="badge-row">${earned.slice(0, 4).map((d) => `<span class="badge-ico" title="${U.esc(d.name)}">${U.icon(d.icon)}</span>`).join('')}</div><p class="small"><strong>${earned.length}</strong> of ${M.Achievements.DEFS.length} earned</p>` : '<p class="muted">The journey has just begun.</p>'}
            ${next ? `<p class="muted small">Next: <strong>${U.esc(next.name)}</strong> — ${U.esc(next.desc)}</p>` : ''}`;
        }
        case 'journal': {
          const j = M.Storage.getJournal()[0];
          return `<div class="row between center"><p class="w-k">Journal</p><button class="btn sm ghost" data-go="journal">Open</button></div>
            ${j ? `<p class="kind">${U.esc(j.category.charAt(0) + j.category.slice(1).toLowerCase())} · ${U.fmtDate(j.createdAt, { month: 'short', day: 'numeric' })}</p><p class="clamp3">${U.esc(j.text)}</p>` : '<p class="muted">Write what you are learning.</p>'}`;
        }
        case 'estimate': return M.Analytics.projectionHTML(M.Analytics.projection(g), g);
        case 'vision': return M.Vision.widget();
      }
      return '';
    },

    /* ---------------- today ---------------- */
    today(root) {
      const g = M.Goals.active();
      const tgt = M.Goals.dailyTargetMs(g);
      const tMs = M.Analytics.todayMs(M.Timer.isActive ? M.Timer.elapsed() : 0);
      const pct = tMs / tgt;
      root.innerHTML = `
        <header class="view-head"><p class="eyebrow">Today · ${U.esc(U.fmtLongDate(Date.now()))}</p><h1 class="view-title">${U.esc(U.greeting().replace('.', ''))}. Give God your attention.</h1></header>
        <section class="panel today-hero">
          <div class="ring-wrap">${M.Analytics.ring(pct, 200, 10, 'Today ' + Math.round(pct * 100) + '%')}<div class="ring-center"><span class="ring-pct tnum">${Math.min(100, Math.round(pct * 100))}%</span><span class="label">of today</span></div></div>
          <dl class="kv big">
            <div><dt>Today’s target</dt><dd class="tnum">${U.hm(tgt).toUpperCase()}</dd></div>
            <div><dt>Completed today</dt><dd class="tnum" data-today-done>${U.hm(tMs)}</dd></div>
            <div><dt>Remaining today</dt><dd class="tnum" data-today-rem>${tMs >= tgt ? 'Target reached' : U.hm(tgt - tMs)}</dd></div>
          </dl>
          <div class="row gap wrap">${M.Timer.isActive ? '<button class="btn primary" data-open-focus>Return to prayer</button>' : `<button class="btn primary" data-start-quick>${U.icon('play')} Start prayer</button>`}<button class="btn ghost" data-go="settings">Change target</button></div>
        </section>
        <section class="panel"><h2 class="h3">Today’s sessions</h2>${M.Prayer.timeline(M.Analytics.todaySessions().slice().reverse())}</section>
        <section class="panel"><h2 class="h3">Your rhythm</h2>${M.Analytics.heatmap()}</section>
        <p class="motto center">${U.esc(M.Declarations.encouragement())}</p>`;
      U.$$('[data-start-quick]', root).forEach((b) => b.onclick = () => M.Prayer.start({ mode: 'pray' }));
      U.$$('[data-open-focus]', root).forEach((b) => b.onclick = () => M.Prayer.openFocus());
      U.$$('[data-go]', root).forEach((b) => b.onclick = () => App.go(b.dataset.go));
    },

    /* ---------------- seed journey ---------------- */
    seed(root) {
      const g = M.Goals.active();
      const p = M.Goals.progress(g, M.Timer.isActive ? M.Timer.elapsed() : 0);
      const s = M.Viz.stage(p.pct);
      const tb = M.Goals.isTimeBased(g);
      const scale = (h) => tb ? Math.round(h / 58 * g.target * 10) / 10 : null;
      const ms = M.Achievements.thresholds(g).concat(tb ? [+g.target] : []);
      root.innerHTML = `
        <header class="view-head"><p class="eyebrow">Your faith journey</p><h1 class="view-title">Every completed minute is a seed.</h1>
        <p class="lede">58 hours → seeds → roots → growth → fruit → vision. The tree is a picture of faithfulness, not a prediction of returns.</p></header>
        <section class="seed-stage panel">
          <canvas class="seed-canvas" role="img" aria-label="Seed tree, stage ${s.name}"></canvas>
          <div class="seed-meta">
            <p class="kind">Stage ${s.index + 1} of 7</p>
            <p class="seed-name">${s.name}</p>
            <p class="muted">${s.note}</p>
            <p class="seed-num tnum">${U.esc(M.Goals.fmtValue(p))} <span class="muted">sown of ${g.target} ${U.esc(M.Goals.unitLabel(g))}</span></p>
          </div>
        </section>
        <section class="panel">
          <h2 class="h3">Stages</h2>
          <ol class="stage-list">${M.Viz.STAGES.map((st, i) => `<li class="${i < s.index ? 'past' : i === s.index ? 'now' : ''}"><span class="st-dot" aria-hidden="true"></span><span class="st-name">${st.name}</span><span class="muted small tnum">${tb ? 'from ' + scale(st.from) + 'h' : 'from ' + Math.round(st.from / 58 * 100) + '%'}</span><span class="muted small st-note">${st.note}</span>${i === s.index ? '<span class="pill accent">Now</span>' : ''}</li>`).join('')}</ol>
        </section>
        ${ms.length ? `<section class="panel"><h2 class="h3">Milestones</h2><div class="milestones">${ms.map((h) => `<span class="ms ${p.doneMs >= h * 3600000 ? 'on' : ''}"><span class="tnum">${h}h</span>${p.doneMs >= h * 3600000 ? U.icon('check') : ''}</span>`).join('')}</div></section>` : ''}`;
      M.Viz.mountTree(U.$('.seed-canvas', root), () => M.Goals.progress(g, M.Timer.isActive ? M.Timer.elapsed() : 0).pct);
    },

    /* ---------------- the flow ---------------- */
    flow(root) {
      const g = M.Goals.active();
      const p = M.Goals.progress(g);
      const IMAGINE = [
        'Imagine waking up without your first thought being: How will I make money today?', 'Imagine having uninterrupted time with God.',
        'Imagine being able to spend the morning praying, reading, thinking and creating.', 'Imagine building systems that continue producing value while you sleep.',
        'Imagine having enough margin to serve people.', 'Imagine having time for family.', 'Imagine traveling without feeling like you are escaping your responsibilities.',
        'Imagine teaching thousands of people.', 'Imagine creating products that continue serving people.', 'Imagine giving generously.',
        'Imagine building organizations that outlive you.', 'Imagine having the freedom to say YES to the things God calls you to do.',
        'Imagine no longer measuring your life only by how much money you made.'
      ];
      root.innerHTML = `
        <header class="view-head flow-head">
          <p class="kind"><span class="pill vis">The nations</span></p>
          <h1 class="view-title">The Flow</h1>
          <p class="lede">Provision, opportunity and impact flowing from the nations to your mission — growing with every hour you spend with God.</p>
          <div class="row gap wrap"><button class="btn primary" data-globe>${U.icon('globe')} Enter global flow</button><button class="btn ghost" data-vision>${U.icon('eye')} Enter vision mode</button></div>
        </header>
        ${M.Vision.panel()}
        <section class="panel dark-panel">
          <div class="row between center wrap gap"><p class="kind light">The nations → your mission</p><p class="small light-muted">Brightness grows with your journey: ${Math.floor(p.pct * 100)}%</p></div>
          <canvas class="map-canvas big" aria-label="World map: glowing streams from Africa, Europe, the Americas, Asia, the Middle East and Oceania flowing toward your mission"></canvas>
          <div class="region-row">${M.Viz.REGIONS.map((r) => `<span>${r}</span>`).join('')}</div>
          <p class="scripture-inline">“The wealth of the nations will flow to you like a river that never goes dry.” <span class="muted">Isaiah 66:12 GNT · Scripture</span></p>
        </section>
        <section class="panel dark-panel">
          <p class="kind light">Provision &amp; opportunity — faith visualization</p>
          <canvas class="river-canvas" aria-label="A luminous river entering from the horizon and branching into business, clients, ideas, partnerships, products, systems, investments, opportunities, impact and generosity"></canvas>
          <p class="small light-muted center">The river grows brighter as your seed count increases. Remain attentive to God’s direction, opportunities, wisdom and provision.</p>
        </section>
        <section class="imagine">
          <p class="eyebrow">Imagine your life</p>
          <ol class="imagine-list">${IMAGINE.map((t) => `<li>${U.esc(t)}</li>`).join('')}</ol>
          <p class="imagine-final">Money is a servant.<br>Purpose is the master.</p>
        </section>
        <section class="panel real-panel">${M.Journal.provisionHTML()}</section>`;
      M.Viz.mountFlowMap(U.$('.map-canvas', root), () => 0.25 + 0.75 * p.pct);
      M.Viz.mountRiver(U.$('.river-canvas', root), () => 0.2 + 0.8 * p.pct);
      U.$$('[data-globe]', root).forEach((b) => b.onclick = () => M.Viz.openGlobalFlow());
      U.$$('[data-vision]', root).forEach((b) => b.onclick = () => M.Viz.openVision());
      M.Journal.bindProvision(root);
      M.Vision.countUp(root);
    },

    /* ---------------- daily opening experience ---------------- */
    maybeOpening() {
      const s = M.state.settings; const k = U.dayKey(Date.now());
      if (!s.openingExperience || M.state.meta.lastOpenDay === k) return;
      M.state.meta.lastOpenDay = k; M.Storage.touch('meta');
      if (U.$('#lock')) { const iv = setInterval(() => { if (!U.$('#lock')) { clearInterval(iv); App.opening(); } }, 400); return; }
      App.opening();
    },
    opening() {
      const g = M.Goals.active();
      const v = M.Scripture.today(); const d = M.Declarations.today();
      const el = document.createElement('div');
      el.className = 'cinema opening'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Good morning');
      el.innerHTML = `<div class="opening-inner">
        <p class="op-greet" data-o="1">${U.greeting().toUpperCase()}</p>
        <p class="kind light" data-o="2">Today’s seed</p>
        <p class="op-line" data-o="2">Your goal is not to chase money today.</p>
        <p class="op-line strong" data-o="3">Your goal is to seek God.</p>
        <div class="op-grid" data-o="4">
          <div><p class="kind light">Today’s target</p><p class="op-target tnum">${U.hm(M.Goals.dailyTargetMs(g)).toUpperCase()}</p></div>
          <div><p class="kind light">Today’s Scripture</p><p class="op-verse">${U.esc(v.text)}</p><p class="scripture-ref">${U.esc(v.ref)} ${U.esc(v.v || '')}</p></div>
          <div><p class="kind light">Today’s declaration</p><p class="op-decl">“${U.esc(d.text)}”</p></div>
        </div>
        <div class="row gap wrap center-x" data-o="5"><button class="btn primary lg" data-begin>Begin</button><button class="btn ghost light" data-later>Later</button></div>
      </div><button class="btn ghost light cinema-skip" data-later>Skip</button>`;
      document.body.appendChild(el); document.body.classList.add('cinema-open');
      requestAnimationFrame(() => el.classList.add('in'));
      const rm = U.reducedMotion();
      const times = rm ? [0, 0, 0, 0, 0] : [300, 1800, 3800, 5200, 6000];
      const ids = times.map((t, i) => setTimeout(() => U.$$('[data-o="' + (i + 1) + '"]', el).forEach((n) => n.classList.add('on')), t));
      const close = () => { ids.forEach(clearTimeout); el.classList.remove('in'); document.body.classList.remove('cinema-open'); setTimeout(() => el.remove(), 500); };
      U.$('[data-begin]', el).onclick = () => { close(); App.go('pray'); };
      U.$$('[data-later]', el).forEach((b) => b.onclick = close);
      el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
      el.tabIndex = -1; el.focus();
    }
  };

  M.App = App;

  // Never let an unexpected UI error take the app down silently.
  window.addEventListener('error', (e) => { console.error(e.error || e.message); });
  window.addEventListener('unhandledrejection', (e) => { console.error(e.reason); });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.boot);
  else App.boot();
})(window.MDT = window.MDT || {});
