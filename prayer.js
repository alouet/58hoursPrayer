/* ==========================================================================
   prayer.js — Pray view, Prayer Room / Focus Mode, session end flow,
   session history (timeline, edit, delete) and manual logging.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const MODES = [
    { id: 'pray', label: 'Pray', icon: 'pray' },
    { id: 'declare', label: 'Declare', icon: 'mic' },
    { id: 'worship', label: 'Worship', icon: 'music' },
    { id: 'scripture', label: 'Read Scripture', icon: 'book' },
    { id: 'meditate', label: 'Meditate', icon: 'silence' },
    { id: 'listen', label: 'Listen', icon: 'ear' },
    { id: 'journal', label: 'Journal', icon: 'journal' },
    { id: 'direction', label: 'Seek Direction', icon: 'compass' },
    { id: 'gratitude', label: 'Gratitude', icon: 'heart' },
    { id: 'intercession', label: 'Intercession', icon: 'hands' }
  ];
  const TAGS = ['Prayer', 'Scripture', 'Wisdom', 'Direction', 'Purpose', 'Money', 'Family', 'Business', 'Ministry', 'Personal', 'Revelation'];
  const SOWN = ['Time', 'Prayer', 'Faith', 'Obedience', 'Wisdom', 'Worship', 'Scripture', 'Gratitude', 'Intercession', 'Silence', 'Listening', 'Purpose'];
  const BACKGROUNDS = [
    { id: 'night', label: 'Night Sky' }, { id: 'mountain', label: 'Mountain' }, { id: 'room', label: 'Quiet Room' },
    { id: 'ocean', label: 'Ocean' }, { id: 'garden', label: 'Garden' }, { id: 'sunrise', label: 'Sunrise' }
  ];
  const PROMPTS = [
    { at: 0, dur: 4.5, text: 'Be still.', big: true },
    { at: 4.5, dur: 6, text: 'You are not in a hurry.' },
    { at: 10, dur: 10, text: 'Seek.' },
    { at: 300, dur: 12, text: 'Listen.' },
    { at: 900, dur: 12, text: 'Write.' },
    { at: 1800, dur: 12, text: 'Obey.' }
  ];

  let unsub = null;
  let selectedMode = 'pray';
  let liveCompletionFired = false;

  const P = {
    MODES, TAGS, SOWN, BACKGROUNDS,
    mode(id) { return MODES.find((m) => m.id === id) || MODES[0]; },
    modeLabel(id) { return P.mode(id).label; },

    /* ------------------------------------------------------------------ */
    render(root) {
      const s = M.state.settings;
      const active = M.Timer.active;
      const g = M.Goals.active();
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Prayer</p>
          <h1 class="view-title">I am here to sow.</h1>
          <p class="lede">Every hour spent with God is a seed. Choose how you will seek Him, then begin.</p>
        </header>
        ${active ? `<section class="panel live-panel">
            <p class="eyebrow">Session in progress · ${U.esc(P.modeLabel(active.mode))}</p>
            <p class="live-time tnum" data-live-time>${U.hms(M.Timer.elapsed())}</p>
            <p class="muted">${active.paused ? 'Paused' : 'You are sowing.'}</p>
            <div class="row gap wrap center-x"><button class="btn primary lg" data-open-focus>Return to the prayer room</button></div>
          </section>` : `
        <section class="panel start-panel">
          <p class="label">Session mode</p>
          <div class="mode-grid" role="radiogroup" aria-label="Session mode">
            ${MODES.map((m) => `<button class="mode ${m.id === selectedMode ? 'on' : ''}" role="radio" aria-checked="${m.id === selectedMode}" data-mode="${m.id}">${U.icon(m.icon)}<span>${m.label}</span></button>`).join('')}
          </div>
          <div class="grid2">
            <label class="field"><span>Session title (optional)</span><input id="p-title" placeholder="e.g. Morning prayer"></label>
            <label class="field"><span>Counts toward</span><input value="${U.esc(g.name)}" disabled></label>
          </div>
          <div class="row gap wrap center">
            <label class="switch"><input type="checkbox" id="p-awake" ${s.keepAwake ? 'checked' : ''}><span class="track"></span><span>Keep screen awake</span></label>
            <span class="muted small">${M.Timer.wakeSupported ? 'Screen awake enabled where supported.' : 'This browser cannot keep the screen awake — the timer still stays accurate.'}</span>
          </div>
          <button class="btn primary xl start-btn" data-start>${U.icon('play')} Start prayer</button>
          <button class="btn ghost sm" data-log>${U.icon('plus')} Log time prayed away from the app</button>
        </section>`}
        <section class="panel soft">
          <p class="label">Prayer room background</p>
          <div class="bg-grid">${BACKGROUNDS.map((b) => `<button class="bg-swatch bg-${b.id} ${s.background === b.id ? 'on' : ''}" data-bg="${b.id}" aria-pressed="${s.background === b.id}"><span>${b.label}</span></button>`).join('')}</div>
        </section>
        <section>
          <header class="section-head row between center wrap gap"><div><p class="eyebrow">Your prayer journey</p><h2 class="h2">Session history</h2></div>
          <button class="btn ghost sm" data-log>${U.icon('plus')} Add session</button></header>
          <div id="timeline">${P.timeline(M.Storage.getSessions().slice().reverse())}</div>
        </section>`;

      U.$$('[data-mode]', root).forEach((b) => b.onclick = () => { selectedMode = b.dataset.mode; U.$$('[data-mode]', root).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); });
      const st = U.$('[data-start]', root);
      if (st) st.onclick = () => {
        const awake = U.$('#p-awake', root).checked;
        M.Storage.saveSettings({ keepAwake: awake });
        P.start({ mode: selectedMode, title: U.$('#p-title', root).value.trim(), keepAwake: awake });
      };
      U.$$('[data-log]', root).forEach((b) => b.onclick = () => P.editSession(null));
      U.$$('[data-bg]', root).forEach((b) => b.onclick = () => { M.Storage.saveSettings({ background: b.dataset.bg }); P.render(root); });
      const of = U.$('[data-open-focus]', root); if (of) of.onclick = () => P.openFocus();
    },

    /** Timeline grouped by day */
    timeline(sessions, { limit = 0, compact = false } = {}) {
      if (!sessions.length) return `<div class="empty"><div class="empty-ico">${U.icon('seed')}</div><p class="empty-title">Your first seed is waiting.</p><p class="muted">Start a prayer session and it will appear here.</p></div>`;
      if (limit) sessions = sessions.slice(0, limit);
      const groups = [];
      sessions.forEach((s) => { const k = U.dayKey(s.start); let g = groups.find((x) => x.k === k); if (!g) groups.push(g = { k, ts: s.start, items: [] }); g.items.push(s); });
      return `<div class="timeline ${compact ? 'compact' : ''}">${groups.map((g) => `
        <div class="tl-day"><p class="tl-date">${U.fmtDate(g.ts, { weekday: compact ? undefined : 'long', month: 'long', day: 'numeric' })} <span class="muted tnum">· ${U.hm(g.items.reduce((a, s) => a + s.durationMs, 0))}</span></p>
          <ol>${g.items.map((s) => `<li class="tl-item">
            <span class="tl-ico" aria-hidden="true">${U.icon(P.mode(s.mode).icon)}</span>
            <div class="tl-main"><p class="tl-title"><span class="tnum">${U.fmtTime(s.start)}–${U.fmtTime(s.end || s.start + s.durationMs)}</span> <strong class="tnum">${U.hm(s.durationMs)}</strong></p>
              <p class="tl-sub">“${U.esc(s.title || P.modeLabel(s.mode))}” <span class="muted">· ${U.esc(P.modeLabel(s.mode))}${s.source === 'manual' ? ' · logged' : ''}</span></p>
              ${!compact && s.notes ? `<p class="tl-notes">${U.esc(s.notes)}</p>` : ''}
              ${!compact && (s.sown || []).length ? `<p class="tl-tags">${s.sown.map((t) => `<span class="tag">${U.esc(t)}</span>`).join('')}</p>` : ''}</div>
            ${compact ? '' : `<div class="tl-actions"><button class="icon-btn sm" data-edit-session="${s.id}" aria-label="Edit session">${U.icon('edit')}</button><button class="icon-btn sm" data-del-session="${s.id}" aria-label="Delete session">${U.icon('trash')}</button></div>`}
          </li>`).join('')}</ol></div>`).join('')}</div>`;
    },

    bind() {
      U.on(document.body, 'click', '[data-edit-session]', (e, b) => P.editSession(b.dataset.editSession));
      U.on(document.body, 'click', '[data-del-session]', async (e, b) => {
        const s = M.Storage.getSessions().find((x) => x.id === b.dataset.delSession); if (!s) return;
        const ok = await U.confirm('Delete this session?', U.hm(s.durationMs) + ' on ' + U.fmtDate(s.start) + ' will be removed from your journey.', { ok: 'Delete session', danger: true });
        if (ok) { M.Storage.deleteSession(s.id); U.toast('Session deleted.'); M.App.refresh(); }
      });
      // live display refresh
      M.Timer.subscribe((type) => {
        const a = M.Timer.active;
        const el = M.Timer.elapsed();
        U.$$('[data-live-time]').forEach((n) => { n.textContent = U.hms(el); });
        P.updateLivePill();
        if (type === 'planned') { if (M.Sound) M.Sound.chime(); U.toast('Your meditation time is complete. Stay as long as you like.'); }
        if (a && !liveCompletionFired) {
          const g = M.Storage.getGoal(a.goalId);
          if (g && M.Goals.isTimeBased(g) && !M.state.meta.completedGoals[g.id]) {
            const p = M.Goals.progress(g, el);
            if (p.complete) {
              liveCompletionFired = true;
              M.state.meta.completedGoals[g.id] = Date.now(); M.Storage.touch('meta');
              M.Viz.completion(g);
            }
          }
        }
        if (type === 'start' || type === 'end' || type === 'restore' || type === 'pause' || type === 'resume') P.syncFocusControls();
      });
    },

    /** Floating pill shown when a session runs outside the prayer room */
    updateLivePill() {
      const pill = U.$('#live-pill'); if (!pill) return;
      const a = M.Timer.active;
      const inFocus = !!U.$('#focus');
      pill.hidden = !a || inFocus;
      if (a) { U.$('.lp-time', pill).textContent = U.hms(M.Timer.elapsed()); U.$('.lp-state', pill).textContent = a.paused ? 'Paused' : 'Sowing'; pill.classList.toggle('paused', a.paused); }
    },

    /* ------------------------------------------------------------------ */
    start(opts) {
      if (M.Timer.isActive) { P.openFocus(); return; }
      liveCompletionFired = false;
      M.Timer.start(opts);
      P.openFocus(true);
      if (M.Sound && M.state.settings.sound !== 'silent') M.Sound.play(M.state.settings.sound);
    },

    openFocus(fresh) {
      const a = M.Timer.active; if (!a) return;
      if (U.$('#focus')) return;
      const s = M.state.settings;
      const verse = (a.verseRef && M.Scripture.byId(a.verseRef)) || M.Scripture.today();
      const decl = M.Declarations.today();
      const el = document.createElement('div');
      el.id = 'focus';
      el.className = 'focus bg-' + s.background;
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Prayer room');
      el.innerHTML = `
        <canvas class="focus-bg" aria-hidden="true"></canvas>
        <div class="focus-top">
          <span class="focus-mode">${U.icon(P.mode(a.mode).icon)} ${U.esc(a.title || P.modeLabel(a.mode))}</span>
          <div class="row gap-s">
            <button class="icon-btn light" data-f="sound" aria-label="Ambient sound">${U.icon(M.Sound && M.Sound.playing ? 'sound' : 'mute')}</button>
            <button class="icon-btn light ${a.keepAwake ? 'on' : ''}" data-f="awake" aria-pressed="${!!a.keepAwake}" aria-label="Keep screen awake">${U.icon('sun')}</button>
            <button class="icon-btn light" data-f="note" aria-label="Write a note">${U.icon('journal')}</button>
            <button class="icon-btn light" data-f="fs" aria-label="Full screen">${U.icon('expand')}</button>
            <button class="icon-btn light" data-f="min" aria-label="Leave the prayer room (timer keeps running)">${U.icon('minimize')}</button>
          </div>
        </div>
        <div class="focus-center">
          <p class="focus-prompt" aria-live="polite"></p>
          <p class="focus-time tnum" data-live-time>${U.hms(M.Timer.elapsed())}</p>
          <p class="focus-sub">You are sowing.</p>
          <div class="focus-controls">
            <div class="adj"><button class="btn light-outline adj-btn" data-f="minus15" aria-label="Remove 15 minutes">−15</button><button class="btn light-outline adj-btn" data-f="minus5" aria-label="Remove 5 minutes">−5</button></div>
            <button class="btn round light" data-f="toggle" aria-label="Pause">${U.icon('pause')}</button>
            <div class="adj"><button class="btn light-outline adj-btn" data-f="plus5" aria-label="Add 5 minutes">+5</button><button class="btn light-outline adj-btn" data-f="plus15" aria-label="Add 15 minutes">+15</button></div>
          </div>
          <p class="adj-hint">minutes</p>
          ${M.state.settings.vision.showInPrayer ? `<div class="focus-va"><p class="kind light">Vision account</p><p class="focus-va-amt tnum" data-vision-total>${U.esc(M.Vision.fmt(M.Vision.value(), M.Vision.home()))}</p><div class="va-live" aria-live="off"></div></div>` : ''}
          <button class="btn end-btn" data-f="end">${U.icon('stop')} End session</button>
        </div>
        <div class="focus-words">
          <figure class="focus-verse"><p class="kind light">Scripture</p><blockquote>${U.esc(verse.text)}</blockquote><figcaption>${U.esc(verse.ref)} ${U.esc(verse.v || '')}</figcaption></figure>
          <figure class="focus-decl"><p class="kind light">Personal declaration</p><p>“${U.esc(decl.text)}”</p></figure>
          <div class="focus-seed"><canvas aria-label="Your faith journey"></canvas><p class="small"><span data-focus-stage></span></p></div>
        </div>
        <p class="focus-stay">Stay here.</p>
        <p class="focus-wake small" data-wake-note></p>`;
      document.body.appendChild(el);
      document.body.classList.add('focus-open');
      requestAnimationFrame(() => el.classList.add('in'));
      P.drawRoom(U.$('.focus-bg', el), s.background);
      const g = M.Storage.getGoal(a.goalId) || M.Goals.active();
      M.Viz.mountTree(U.$('.focus-seed canvas', el), () => M.Goals.progress(g, M.Timer.elapsed()).pct);
      const stageEl = U.$('[data-focus-stage]', el);

      // prompts loop
      const promptEl = U.$('.focus-prompt', el); const subEl = U.$('.focus-sub', el);
      let lastPrompt = null, lastEnc = 0;
      const promptTick = () => {
        if (!el.isConnected || !M.Timer.active) return;
        const sec = M.Timer.elapsed() / 1000;
        const pr = PROMPTS.find((p) => sec >= p.at && sec < p.at + p.dur && (M.state.settings.prompts || p.at < 10));
        const txt = pr ? pr.text : '';
        if (txt !== lastPrompt) {
          lastPrompt = txt;
          promptEl.classList.remove('on');
          setTimeout(() => { promptEl.textContent = txt; promptEl.classList.toggle('big', !!(pr && pr.big)); if (txt) promptEl.classList.add('on'); }, 350);
        }
        // gentle encouragement every 3 minutes
        if (!M.Timer.isPaused && sec - lastEnc > 180 && sec > 60) { lastEnc = sec; subEl.textContent = M.Declarations.encouragement(); }
        if (M.Timer.isPaused) subEl.textContent = 'Paused. Take your time.';
        else if (subEl.textContent === 'Paused. Take your time.') subEl.textContent = 'You are sowing.';
        stageEl.textContent = M.Viz.stage(M.Goals.progress(g, M.Timer.elapsed()).pct).name + ' · your faith journey';
        setTimeout(promptTick, 1000);
      };
      promptTick();

      U.on(el, 'click', '[data-f]', async (e, b) => {
        const f = b.dataset.f;
        if (f === 'toggle') M.Timer.toggle();
        if (f === 'plus5') { M.Timer.addTime(5 * 60000); U.toast('5 minutes added.'); }
        if (f === 'plus15') { M.Timer.addTime(15 * 60000); U.toast('15 minutes added.'); }
        if (f === 'minus5' || f === 'minus15') {
          const want = f === 'minus5' ? 5 : 15;
          const done = -M.Timer.addTime(-want * 60000);
          U.toast(done < want * 60000 - 1000 ? 'Timer set back to ' + U.hms(M.Timer.elapsed()) + '.' : want + ' minutes removed.');
        }
        if (f === 'end') P.finish();
        if (f === 'min') P.closeFocus();
        if (f === 'fs') M.Viz.requestFullscreen(el);
        if (f === 'sound') { if (!M.Sound) return; if (M.Sound.playing) M.Sound.stop(); else M.Sound.play(M.state.settings.sound === 'silent' ? 'ambience' : M.state.settings.sound); b.innerHTML = U.icon(M.Sound.playing ? 'sound' : 'mute'); }
        if (f === 'awake') {
          const on = !M.Timer.active.keepAwake;
          const ok = await M.Timer.setKeepAwake(on);
          b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
          U.toast(on ? (ok ? 'Screen awake enabled where supported.' : 'This device did not allow keeping the screen awake. The timer stays accurate anyway.') : 'Screen may sleep. The timer keeps counting.');
        }
        if (f === 'note') P.quickNote();
      });
      el.addEventListener('keydown', (e) => {
        if (e.target.matches('input,textarea')) return;
        if (e.key === ' ') { e.preventDefault(); M.Timer.toggle(); }
        if (e.key === 'Escape') P.closeFocus();
      });
      P.syncFocusControls();
      el.tabIndex = -1; el.focus();
      P.updateLivePill();
    },
    syncFocusControls() {
      const el = U.$('#focus'); if (!el) return;
      const t = U.$('[data-f="toggle"]', el);
      if (!M.Timer.active) return;
      t.innerHTML = U.icon(M.Timer.isPaused ? 'play' : 'pause');
      t.setAttribute('aria-label', M.Timer.isPaused ? 'Resume' : 'Pause');
      el.classList.toggle('paused', M.Timer.isPaused);
      const w = U.$('[data-wake-note]', el);
      if (w) w.textContent = M.Timer.active.keepAwake ? (M.Timer.wakeOn ? 'Screen awake enabled where supported.' : (M.Timer.wakeSupported ? '' : 'The timer stays accurate even if the screen sleeps.')) : '';
    },
    closeFocus() {
      const el = U.$('#focus'); if (!el) return;
      el.classList.remove('in'); document.body.classList.remove('focus-open');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setTimeout(() => { el.remove(); P.updateLivePill(); }, 400);
      M.App.refresh();
    },
    quickNote() {
      const a = M.Timer.active; if (!a) return;
      const m = U.modal(`<h3 class="modal-title">Write while you listen</h3>
        <label class="field"><span>This note is attached to the session when you end it.</span><textarea id="qn" rows="6" placeholder="Instructions, revelations, prayers…">${U.esc(a.note || '')}</textarea></label>
        <div class="row end gap"><button class="btn primary" data-qn-save>Keep note</button></div>`, { label: 'Session note' });
      U.$('[data-qn-save]', m).onclick = () => { a.note = U.$('#qn', m).value; M.Storage.saveActive(a); U.closeModal(); U.toast('Note kept with this session.'); };
    },

    /** Animated prayer-room backdrop (always dark and cinematic) */
    drawRoom(cv, bg) {
      const rnd = U.rng(7); const stars = Array.from({ length: 140 }, () => ({ x: rnd(), y: rnd(), r: rnd() * 1.3 + 0.2, p: rnd() * 6 }));
      M.Viz.animate(cv, (ctx, W, H, t) => {
        const A = M.Viz.rgba; const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#d4ae62';
        const grad = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
        if (bg === 'night') {
          grad([[0, '#03050c'], [1, '#0b1226']]);
          stars.forEach((s) => { ctx.fillStyle = 'rgba(235,240,255,' + (0.25 + 0.45 * (Math.sin(t * 0.8 + s.p) + 1) / 2) + ')'; ctx.beginPath(); ctx.arc(s.x * W, s.y * H * 0.85, s.r, 0, 6.28); ctx.fill(); });
        } else if (bg === 'mountain') {
          grad([[0, '#0a0f1f'], [0.6, '#1a2238'], [1, '#2a2a3a']]);
          stars.slice(0, 50).forEach((s) => { ctx.fillStyle = 'rgba(235,240,255,0.35)'; ctx.fillRect(s.x * W, s.y * H * 0.4, 1, 1); });
          [[0.55, '#141b2e', 0.004, 60], [0.66, '#10162a', 0.007, 45], [0.78, '#0a0f1f', 0.011, 30]].forEach(([base, col, f, amp], i) => {
            ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
            for (let x = 0; x <= W; x += 6) ctx.lineTo(x, H * base - Math.abs(Math.sin(x * f + i) * amp + Math.sin(x * f * 2.7 + i * 3) * amp * 0.4));
            ctx.lineTo(W, H); ctx.fill();
          });
          ctx.fillStyle = 'rgba(200,210,230,' + (0.04 + Math.sin(t * 0.2) * 0.02) + ')'; ctx.fillRect(0, H * 0.7, W, H * 0.3);
        } else if (bg === 'ocean') {
          grad([[0, '#050b18'], [0.55, '#0d1a33'], [0.56, '#07101f'], [1, '#040812']]);
          const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.4); g.addColorStop(0, 'rgba(180,200,240,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          for (let k = 0; k < 22; k++) { const y = H * 0.57 + k * k * 0.9; ctx.strokeStyle = 'rgba(170,195,235,' + (0.05 + 0.1 * (1 - k / 22)) + ')'; ctx.beginPath(); for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.02 + t * (0.6 + k * 0.03) + k) * (1 + k * 0.25)); ctx.stroke(); }
        } else if (bg === 'garden') {
          grad([[0, '#040b08'], [1, '#0c1f16']]);
          stars.slice(0, 40).forEach((s, i) => { const x = (s.x * W + Math.sin(t * 0.3 + s.p) * 30), y = (s.y * H + Math.cos(t * 0.25 + s.p) * 20); const a = 0.3 + 0.5 * (Math.sin(t * 1.3 + s.p) + 1) / 2; ctx.fillStyle = 'rgba(230,220,140,' + a * 0.25 + ')'; ctx.beginPath(); ctx.arc(x, y, 6, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(245,235,170,' + a + ')'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 6.28); ctx.fill(); });
          ctx.fillStyle = '#06130d'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 10) ctx.lineTo(x, H * 0.86 - Math.abs(Math.sin(x * 0.05)) * 18); ctx.lineTo(W, H); ctx.fill();
        } else if (bg === 'sunrise') {
          const rise = Math.min(1, t / 240);
          grad([[0, '#0b0f24'], [0.55, '#3a2a45'], [0.85, '#8a5540'], [1, '#c98a52']]);
          const sy = H * (0.95 - rise * 0.15);
          const g = ctx.createRadialGradient(W / 2, sy, 0, W / 2, sy, W * 0.6); g.addColorStop(0, 'rgba(255,210,150,0.55)'); g.addColorStop(0.2, 'rgba(255,180,120,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,225,180,0.9)'; ctx.beginPath(); ctx.arc(W / 2, sy, Math.min(W, H) * 0.06, 0, 6.28); ctx.fill();
          ctx.fillStyle = '#120d1a'; ctx.fillRect(0, H * 0.93, W, H * 0.07);
        } else { // quiet room
          grad([[0, '#0d0b0a'], [1, '#1a1512']]);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createLinearGradient(W * 0.75, 0, W * 0.35, H); g.addColorStop(0, 'rgba(255,220,170,0.16)'); g.addColorStop(1, 'rgba(255,220,170,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W * 0.62, 0); ctx.lineTo(W * 0.86, 0); ctx.lineTo(W * 0.6, H); ctx.lineTo(W * 0.2, H); ctx.fill();
          stars.slice(0, 60).forEach((s) => { const x = W * (0.3 + s.x * 0.5) + Math.sin(t * 0.2 + s.p) * 10, y = (s.y * H + t * 4 * s.r) % H; ctx.fillStyle = 'rgba(255,230,190,' + (0.1 + s.r * 0.15) + ')'; ctx.fillRect(x, y, 1.2, 1.2); });
          ctx.restore();
        }
        // accent veil keeps every room tied to the chosen theme
        const v = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.55);
        v.addColorStop(0, A(acc, 0.1)); v.addColorStop(1, A(acc, 0)); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      });
    },

    /* ------------------------------------------------------------------ */
    /** End the running session and walk through the Seed Sown experience */
    finish() {
      const a = M.Timer.active; if (!a) return;
      const g = M.Storage.getGoal(a.goalId) || M.Goals.active();
      const before = M.Goals.progress(g);
      const note = a.note || '';
      const saved = M.Timer.end();
      if (M.Sound) M.Sound.stop();
      P.closeFocus();
      if (!saved) { U.toast('That session was too short to save.'); return; }
      const after = M.Goals.progress(g);
      P.endFlow(saved, g, before, after, note);
    },

    endFlow(session, g, before, after, note) {
      const timeBased = M.Goals.isTimeBased(g);
      const el = document.createElement('div');
      el.className = 'cinema end-flow'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Session complete');
      el.innerHTML = `
        <div class="end-inner">
          <section class="end-stats">
            <p class="kind light">Session complete</p>
            <p class="end-k" data-s="1">Seed sown</p>
            <p class="end-big tnum" data-s="1">${U.hms(session.durationMs)}</p>
            <p class="end-phrase" data-s="1">You just sowed ${U.phrase(session.durationMs)}.</p>
            <p class="end-va" data-s="2"><span class="kind light">Vision account</span> <strong class="tnum">+ ${U.esc(M.Vision.fmt(M.Vision.sessionValue(session.durationMs), M.Vision.home()))}</strong></p>
            <div class="end-pair">
              <div data-s="2"><p class="end-k">Total sown</p><p class="end-mid tnum">${timeBased ? U.hms(after.doneMs) : U.esc(M.Goals.fmtValue(after))}</p></div>
              <div data-s="3"><p class="end-k">Remaining</p><p class="end-mid tnum">${timeBased ? U.hms(after.remainingMs) : U.esc(M.Goals.fmtRemaining(after))}</p></div>
            </div>
            <canvas class="end-tree" data-s="4" aria-label="Your faith journey tree"></canvas>
            <p class="end-msg" data-s="4">Another seed has been planted.</p>
          </section>
          <section class="end-form" data-s="5">
            <h2 class="end-q">What did you sow today?</h2>
            <div class="chip-row" role="group" aria-label="What did you sow">${SOWN.map((s) => `<button class="chip seed-chip" data-sown="${s}" aria-pressed="false">${U.icon('seed')} ${s}</button>`).join('')}</div>
            <h2 class="end-q">What did you receive during this time?</h2>
            <label class="sr-only" for="end-note">Journal</label>
            <textarea id="end-note" rows="4" placeholder="Write your thoughts, instructions, revelations or prayers…">${U.esc(note)}</textarea>
            <div class="chip-row" role="group" aria-label="Tags">${TAGS.map((t) => `<button class="chip sm" data-tag="${t}" aria-pressed="false">${t}</button>`).join('')}</div>
            <div class="grid2">
              <label class="field"><span>Session title</span><input id="end-title" value="${U.esc(session.title)}"></label>
              <label class="field"><span>Category</span><select id="end-mode">${MODES.map((m) => `<option value="${m.id}" ${m.id === session.mode ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
            </div>
            <div class="row gap wrap end-actions">
              <button class="btn primary" data-end="continue">Continue</button>
              <button class="btn ghost light" data-end="journal">${U.icon('journal')} Journal</button>
              <button class="btn ghost light" data-end="journey">${U.icon('seed')} View journey</button>
            </div>
          </section>
        </div>`;
      document.body.appendChild(el); document.body.classList.add('cinema-open');
      requestAnimationFrame(() => el.classList.add('in'));
      const rm = U.reducedMotion();
      [1, 2, 3, 4, 5].forEach((n, i) => setTimeout(() => U.$$('[data-s="' + n + '"]', el).forEach((x) => x.classList.add('on')), rm ? 0 : 300 + i * 900));
      const t0 = performance.now();
      M.Viz.animate(U.$('.end-tree', el), (ctx, W, H, t) => { ctx.clearRect(0, 0, W, H); const k = U.clamp((performance.now() - t0 - 3000) / 2200, 0, 1); M.Viz.drawTree(ctx, W, H, before.pct + (after.pct - before.pct) * (rm ? 1 : k), t, {}); });
      U.on(el, 'click', '[data-sown],[data-tag]', (e, b) => { const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); });
      U.on(el, 'click', '[data-end]', (e, b) => {
        const sown = U.$$('[data-sown].on', el).map((x) => x.dataset.sown);
        const tags = U.$$('[data-tag].on', el).map((x) => x.dataset.tag);
        const txt = U.$('#end-note', el).value.trim();
        session.sown = sown; session.tags = tags; session.notes = txt;
        session.title = U.$('#end-title', el).value.trim() || P.modeLabel(U.$('#end-mode', el).value);
        session.mode = U.$('#end-mode', el).value;
        M.Storage.saveSession(session);
        if (txt) M.Storage.saveJournalEntry({ id: 'jr_' + session.id, createdAt: Date.now(), category: 'WHAT GOD IS TEACHING ME', title: session.title, text: txt, tags, favorite: false, sessionId: session.id });
        if (sown.length) U.toast('Seed planted.');
        el.classList.remove('in'); document.body.classList.remove('cinema-open'); setTimeout(() => el.remove(), 450);
        const where = b.dataset.end;
        M.App.go(where === 'journal' ? 'journal' : where === 'journey' ? 'seed' : 'dashboard');
        M.Achievements.check();
        M.Achievements.afterProgress(g, before.doneMs, after.doneMs, before, after);
      });
      setTimeout(() => { const b = U.$('[data-end="continue"]', el); if (b) b.focus({ preventScroll: true }); }, rm ? 50 : 4600);
    },

    /** Edit an existing session, or log a new one when id is null */
    editSession(id) {
      const existing = id ? M.Storage.getSessions().find((s) => s.id === id) : null;
      const now = Date.now();
      const s = existing || { start: now - 3600000, durationMs: 3600000, title: '', mode: 'pray', notes: '', tags: [] };
      const dm = Math.round(s.durationMs / 60000);
      const m = U.modal(`
        <h3 class="modal-title">${existing ? 'Edit session' : 'Log a session'}</h3>
        ${existing ? '' : '<p class="muted small">For time you spent with God away from the timer.</p>'}
        <form class="form" id="ses-form">
          <div class="grid2">
            <label class="field"><span>Date</span><input id="s-date" type="date" required value="${U.toInputDate(s.start)}"></label>
            <label class="field"><span>Start time</span><input id="s-time" type="time" required value="${U.toInputTime(s.start)}"></label>
          </div>
          <div class="grid2">
            <label class="field"><span>Hours</span><input id="s-h" type="number" min="0" max="24" value="${Math.floor(dm / 60)}"></label>
            <label class="field"><span>Minutes</span><input id="s-m" type="number" min="0" max="59" value="${dm % 60}"></label>
          </div>
          <label class="field"><span>Title</span><input id="s-title" value="${U.esc(s.title)}" placeholder="e.g. Wisdom meditation"></label>
          <label class="field"><span>Category</span><select id="s-mode">${MODES.map((x) => `<option value="${x.id}" ${x.id === s.mode ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
          <label class="field"><span>Notes</span><textarea id="s-notes" rows="3">${U.esc(s.notes || '')}</textarea></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${existing ? 'Save session' : 'Log session'}</button></div>
        </form>`, { label: 'Session editor' });
      U.$('#ses-form', m).onsubmit = (e) => {
        e.preventDefault();
        const start = U.fromInputs(U.$('#s-date', m).value, U.$('#s-time', m).value);
        const dur = ((+U.$('#s-h', m).value || 0) * 60 + (+U.$('#s-m', m).value || 0)) * 60000;
        if (dur < 60000) return U.toast('A session needs at least 1 minute.', 'warn');
        if (dur > 24 * 3600000) return U.toast('A single session cannot exceed 24 hours.', 'warn');
        if (start + dur > Date.now() + 60000) return U.toast('That session would end in the future.', 'warn');
        const g = existing ? (M.Storage.getGoal(existing.goalId) || M.Goals.active()) : M.Goals.active();
        const before = M.Goals.progress(g);
        const rec = Object.assign({}, existing || { id: U.uid('ses'), goalId: g.id, source: 'manual', createdAt: Date.now(), sown: [], tags: [] }, {
          start, end: start + dur, durationMs: dur, title: U.$('#s-title', m).value.trim() || P.modeLabel(U.$('#s-mode', m).value),
          mode: U.$('#s-mode', m).value, notes: U.$('#s-notes', m).value.trim()
        });
        M.Storage.saveSession(rec);
        U.closeModal(); U.toast(existing ? 'Session saved.' : 'Session logged. Seed planted.');
        const after = M.Goals.progress(g);
        M.App.refresh();
        M.Achievements.check();
        if (!existing) M.Achievements.afterProgress(g, before.doneMs, after.doneMs, before, after);
      };
    }
  };

  M.Prayer = P;
})(window.MDT = window.MDT || {});
