/* ==========================================================================
   settings.js — appearance, targets, sound, reminders, sync, privacy, PIN lock
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const THEMES = [
    { id: 'midnight', name: 'Midnight', sub: 'Black + electric blue', sw: ['#05070b', '#4c8dff'] },
    { id: 'royal', name: 'Royal', sub: 'Deep navy + royal blue', sw: ['#0a1030', '#6b83ff'] },
    { id: 'fire', name: 'Fire', sub: 'Dark + crimson', sw: ['#140709', '#e5484d'] },
    { id: 'gold', name: 'Gold', sub: 'Dark navy + gold', sw: ['#0a0f1e', '#d4ae62'] },
    { id: 'forest', name: 'Forest', sub: 'Deep green + emerald', sw: ['#06140e', '#3ecf8e'] },
    { id: 'heaven', name: 'Heaven', sub: 'White + blue', sw: ['#f6f9ff', '#2f6fe4'] },
    { id: 'amethyst', name: 'Amethyst', sub: 'Dark purple + violet', sw: ['#110a1e', '#a78bfa'] },
    { id: 'ocean', name: 'Ocean', sub: 'Deep blue + cyan', sw: ['#04111c', '#22c3e6'] }
  ];
  const TARGETS = [30, 60, 120, 180, 240];

  /* ---------- fonts (all from Google Fonts; loaded only when chosen) ---------- */
  const SERIF_FB = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
  const SANS_FB = '"Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';
  const FONTS = {
    display: [
      ['Cormorant Garamond', 'serif', 'ital,wght@0,400;0,500;0,600;1,400;1,500'], ['Playfair Display', 'serif', 'ital,wght@0,400;0,500;0,600;1,400'],
      ['EB Garamond', 'serif', 'ital,wght@0,400;0,500;0,600;1,400'], ['Lora', 'serif', 'ital,wght@0,400;0,500;0,600;1,400'],
      ['Libre Baskerville', 'serif', 'ital,wght@0,400;0,700;1,400'], ['Crimson Pro', 'serif', 'ital,wght@0,400;0,500;0,600;1,400'],
      ['Fraunces', 'serif', 'ital,wght@0,400;0,500;0,600;1,400'], ['DM Serif Display', 'serif', 'ital@0;1'],
      ['Merriweather', 'serif', 'ital,wght@0,400;0,700;1,400'], ['Cinzel', 'serif', 'wght@400;500;600'],
      ['Montserrat', 'sans', 'ital,wght@0,400;0,500;0,600;1,400'], ['Poppins', 'sans', 'ital,wght@0,400;0,500;0,600;1,400'],
      ['Raleway', 'sans', 'ital,wght@0,400;0,500;0,600;1,400'], ['Inter', 'sans', 'wght@400;500;600']
    ],
    ui: [
      ['Manrope', 'sans', 'wght@200;300;400;500;600;700;800'], ['Inter', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['Poppins', 'sans', 'wght@200;300;400;500;600;700;800'], ['Montserrat', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['DM Sans', 'sans', 'wght@200;300;400;500;600;700;800'], ['Plus Jakarta Sans', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['Outfit', 'sans', 'wght@200;300;400;500;600;700;800'], ['Nunito', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['Lato', 'sans', 'wght@300;400;700;900'], ['Raleway', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['Work Sans', 'sans', 'wght@200;300;400;500;600;700;800'], ['Urbanist', 'sans', 'wght@200;300;400;500;600;700;800'],
      ['Source Sans 3', 'sans', 'wght@200;300;400;500;600;700;800'], ['Lora', 'serif', 'wght@400;500;600;700']
    ],
    num: [
      ['same', 'sans', ''], ['Manrope', 'sans', 'wght@200;300;400;500;600'], ['Inter', 'sans', 'wght@200;300;400;500;600'],
      ['Outfit', 'sans', 'wght@200;300;400;500;600'], ['Poppins', 'sans', 'wght@200;300;400;500;600'], ['Montserrat', 'sans', 'wght@200;300;400;500;600'],
      ['Space Grotesk', 'sans', 'wght@300;400;500;600'], ['JetBrains Mono', 'sans', 'wght@200;300;400;500;600'],
      ['Cormorant Garamond', 'serif', 'wght@300;400;500;600'], ['Playfair Display', 'serif', 'wght@400;500;600']
    ]
  };
  const PAIRS = [
    ['Classic', 'Cormorant Garamond', 'Manrope', 'same'], ['Editorial', 'Playfair Display', 'Inter', 'same'],
    ['Warm book', 'EB Garamond', 'DM Sans', 'same'], ['Modern', 'Montserrat', 'Montserrat', 'same'],
    ['Soft', 'Lora', 'Nunito', 'same'], ['Royal', 'Cinzel', 'Lato', 'Cormorant Garamond'],
    ['Clean', 'Inter', 'Inter', 'same'], ['Bold', 'DM Serif Display', 'Poppins', 'Outfit']
  ];
  const loaded = new Set();
  function fontDef(role, name) { return FONTS[role].find((f) => f[0] === name); }
  function loadFont(name, axes) {
    if (!name || name === 'same' || loaded.has(name)) return;
    loaded.add(name);
    try {
      const l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(name).replace(/%20/g, '+') + (axes ? ':' + axes : '') + '&display=swap';
      document.head.appendChild(l);
    } catch (e) { /* offline: fallback stack is used */ }
  }
  function stack(name, kind) { return '"' + name + '", ' + (kind === 'serif' ? SERIF_FB : SANS_FB); }

  async function hash(pin, salt) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { // non-secure context fallback (FNV-1a)
      let h = 2166136261; for (const c of salt + ':' + pin) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16);
    }
  }

  const S = {
    THEMES, FONTS, PAIRS,
    applyFonts() {
      const s = M.state.settings; const r = document.documentElement;
      const d = fontDef('display', s.fontDisplay) || FONTS.display[0];
      const u = fontDef('ui', s.fontUI) || FONTS.ui[0];
      const n = s.fontNum && s.fontNum !== 'same' ? (fontDef('num', s.fontNum) || null) : null;
      loaded.add('Cormorant Garamond'); loaded.add('Manrope'); // shipped in the page head
      loadFont(d[0], d[2]); loadFont(u[0], u[2]); if (n) loadFont(n[0], n[2]);
      r.style.setProperty('--serif', stack(d[0], d[1]));
      r.style.setProperty('--sans', stack(u[0], u[1]));
      if (n) r.style.setProperty('--num', stack(n[0], n[1])); else r.style.removeProperty('--num');
      r.style.setProperty('--fs', +s.fontScale || 1);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (M.Viz) M.Viz.redrawAll(); });
    },
    /** Apply theme + mode + motion to the document */
    apply() {
      const s = M.state.settings; const r = document.documentElement;
      r.dataset.accent = s.theme || 'gold';
      if (s.mode === 'auto') r.removeAttribute('data-mode'); else r.dataset.mode = s.mode;
      if (s.customAccent) { r.style.setProperty('--acc-d', s.customAccent); r.style.setProperty('--acc-l', s.customAccent); }
      else { r.style.removeProperty('--acc-d'); r.style.removeProperty('--acc-l'); }
      r.dataset.motion = s.motion;
      S.applyFonts();
      const meta = document.querySelector('meta[name="theme-color"]');
      requestAnimationFrame(() => {
        if (meta) meta.setAttribute('content', getComputedStyle(r).getPropertyValue('--bg').trim() || '#0a0f1e');
        if (M.Viz) M.Viz.redrawAll();
      });
    },

    render(root) {
      const s = M.state.settings;
      const r = s.reminders;
      const tgt = s.dailyTargetMin;
      root.innerHTML = `
        <header class="view-head"><p class="eyebrow">Settings</p><h1 class="view-title">Make the room your own.</h1></header>

        <section class="panel">
          <h2 class="h3">Appearance</h2>
          <p class="label">Mode</p>
          <div class="seg" role="radiogroup" aria-label="Color mode">
            ${[['light', 'sun', 'Light'], ['dark', 'moon', 'Dark'], ['auto', 'settings', 'Auto']].map(([v, ic, l]) => `<button role="radio" aria-checked="${s.mode === v}" class="${s.mode === v ? 'on' : ''}" data-mode-set="${v}">${U.icon(ic)} ${l}</button>`).join('')}
          </div>
          <p class="label">Theme</p>
          <div class="theme-grid">${THEMES.map((t) => `<button class="theme-sw ${s.theme === t.id && !s.customAccent ? 'on' : ''}" data-theme-set="${t.id}" aria-pressed="${s.theme === t.id && !s.customAccent}">
            <span class="sw" style="background:linear-gradient(135deg, ${t.sw[0]} 55%, ${t.sw[1]} 55%)"></span><span class="tn">${t.name}</span><span class="ts">${t.sub}</span></button>`).join('')}</div>
          <div class="row gap wrap center">
            <label class="field inline"><span>Custom accent</span><input type="color" id="st-accent" value="${U.esc(s.customAccent || '#d4ae62')}"></label>
            ${s.customAccent ? '<button class="btn sm ghost" data-accent-clear>Use theme accent</button>' : ''}
          </div>
          <p class="label">Motion</p>
          <div class="seg" role="radiogroup" aria-label="Motion">
            ${[['auto', 'Follow device'], ['full', 'Full'], ['reduced', 'Reduced']].map(([v, l]) => `<button role="radio" aria-checked="${s.motion === v}" class="${s.motion === v ? 'on' : ''}" data-motion-set="${v}">${l}</button>`).join('')}
          </div>
        </section>

        <section class="panel">
          <h2 class="h3">Fonts</h2>
          <p class="label">Quick pairings</p>
          <div class="pair-grid">${PAIRS.map((p) => `<button class="pair ${s.fontDisplay === p[1] && s.fontUI === p[2] && (s.fontNum || 'same') === p[3] ? 'on' : ''}" data-pair="${U.esc(p.join('|'))}"><span class="pair-d" style="font-family:${U.esc(stack(p[1], fontDef('display', p[1])[1]))}">${p[0]}</span><span class="pair-u" style="font-family:${U.esc(stack(p[2], fontDef('ui', p[2])[1]))}">${U.esc(p[1])} + ${U.esc(p[2])}</span></button>`).join('')}</div>
          <div class="font-grid">
            <label class="field"><span>Titles &amp; Scripture</span><select id="st-fd">${FONTS.display.map((f) => `<option ${s.fontDisplay === f[0] ? 'selected' : ''}>${f[0]}</option>`).join('')}</select></label>
            <label class="field"><span>Interface &amp; text</span><select id="st-fu">${FONTS.ui.map((f) => `<option ${s.fontUI === f[0] ? 'selected' : ''}>${f[0]}</option>`).join('')}</select></label>
            <label class="field"><span>Timer &amp; numbers</span><select id="st-fn">${FONTS.num.map((f) => `<option value="${f[0]}" ${(s.fontNum || 'same') === f[0] ? 'selected' : ''}>${f[0] === 'same' ? 'Same as interface' : f[0]}</option>`).join('')}</select></label>
          </div>
          <p class="label">Text size</p>
          <div class="seg" role="radiogroup" aria-label="Text size">${[[0.93, 'Small'], [1, 'Normal'], [1.08, 'Large'], [1.16, 'Extra large']].map(([v, l]) => `<button role="radio" aria-checked="${(+s.fontScale || 1) === v}" class="${(+s.fontScale || 1) === v ? 'on' : ''}" data-fs="${v}">${l}</button>`).join('')}</div>
          <div class="font-preview">
            <p class="fp-title">Wisdom is the principal thing.</p>
            <p class="fp-body">I refuse to make money the master of my time. My greatest pursuit is God, wisdom, understanding and His will.</p>
            <p class="fp-num tnum">21:37:44</p>
          </div>
          <p class="muted small">Fonts download the first time you choose them; offline, a similar system font is used.</p>
        </section>

        <section class="panel">
          <h2 class="h3">Daily target</h2>
          <p class="muted small">A suggestion, not a rule. For the 58-hour journey, 2 hours a day completes it in about a month.</p>
          <div class="chip-row">${TARGETS.map((m) => `<button class="chip ${tgt === m ? 'on' : ''}" data-target="${m}">${m < 60 ? m + ' minutes' : m / 60 + (m === 60 ? ' hour' : ' hours')}</button>`).join('')}
            <span class="custom-min"><input id="st-target" type="number" min="5" step="5" value="${TARGETS.includes(tgt) ? '' : tgt}" placeholder="Custom" aria-label="Custom daily target in minutes"><button class="chip" data-target="custom">Set minutes</button></span></div>
          <p class="muted small">Applies to the active journey (<strong>${U.esc(M.Goals.active().name)}</strong>).</p>
          <p class="label">Preferred prayer windows</p>
          <div class="row gap wrap" id="windows">${(s.windows || []).map((w, i) => `<span class="time-chip"><input type="time" value="${w}" data-win="${i}" aria-label="Prayer window ${i + 1}"><button class="icon-btn sm" data-win-del="${i}" aria-label="Remove">${U.icon('x')}</button></span>`).join('')}
            <button class="btn sm ghost" data-win-add>${U.icon('plus')} Add window</button></div>
        </section>

        <section class="panel">
          <h2 class="h3">Prayer room</h2>
          <label class="switch"><input type="checkbox" id="st-prompts" ${s.prompts ? 'checked' : ''}><span class="track"></span><span>Gentle prompts during prayer (Seek, Listen, Write, Obey)</span></label>
          <label class="switch"><input type="checkbox" id="st-opening" ${s.openingExperience ? 'checked' : ''}><span class="track"></span><span>Daily opening experience</span></label>
          <label class="switch"><input type="checkbox" id="st-awake" ${s.keepAwake ? 'checked' : ''}><span class="track"></span><span>Keep screen awake during prayer (where supported)</span></label>
          <p class="label">Ambient sound</p>
          <div class="chip-row">${M.Sound.OPTIONS.map(([v, l]) => `<button class="chip ${s.sound === v ? 'on' : ''}" data-sound="${v}">${l}</button>`).join('')}</div>
          <div class="row gap center wrap"><label class="field inline grow"><span>Volume</span><input type="range" id="st-vol" min="0" max="1" step="0.05" value="${s.volume}"></label>
            <button class="btn sm ghost" data-sound-test>${M.Sound.playing ? U.icon('mute') + ' Stop preview' : U.icon('sound') + ' Preview'}</button></div>
          <p class="muted small">Sound never starts by itself. It plays when you begin a session or tap preview.</p>
        </section>

        <section class="panel">
          <h2 class="h3">Vision account</h2>
          <p class="muted small">Currency, target amount and how many hours of prayer it takes to reach it. Now: <strong>${U.esc(M.Vision.fmt(+s.vision.target, M.Vision.home(), true))}</strong> at ${M.Vision.targetHours()} hours · ${M.Vision.rateLine()}.</p>
          <div class="row gap"><button class="btn sm ghost" data-va-settings>${U.icon('settings')} Edit vision account</button></div>
        </section>

        <section class="panel">
          <h2 class="h3">Reminders</h2>
          <label class="switch"><input type="checkbox" id="st-rem" ${r.enabled ? 'checked' : ''}><span class="track"></span><span>Gentle reminders</span></label>
          <div class="row gap wrap">${r.times.map((t, i) => `<span class="time-chip"><input type="time" value="${t}" data-rem="${i}" aria-label="Reminder ${i + 1}"><button class="icon-btn sm" data-rem-del="${i}" aria-label="Remove">${U.icon('x')}</button></span>`).join('')}<button class="btn sm ghost" data-rem-add>${U.icon('plus')} Add time</button></div>
          <div class="chip-row" aria-label="Days">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => `<button class="chip sm ${r.days.includes(i) ? 'on' : ''}" aria-pressed="${r.days.includes(i)}" data-rem-day="${i}">${d}</button>`).join('')}</div>
          <p class="muted small">Notifications: <strong>${{ granted: 'allowed', denied: 'blocked in browser settings', default: 'not yet allowed', unsupported: 'not supported here' }[M.Notifications.permission()]}</strong>. Reminders appear while the app is open or running. For reminders when it is closed, add them to your calendar.</p>
          <div class="row gap wrap"><button class="btn sm ghost" data-notif-perm>${U.icon('bell')} Allow notifications</button><button class="btn sm ghost" data-notif-test>Send a test</button><button class="btn sm ghost" data-ics>${U.icon('calendar')} Add to calendar (.ics)</button></div>
        </section>

        <section class="panel">
          <h2 class="h3">Sync across devices</h2>
          <p class="sync-detail"><span class="sync-dot" data-state="${M.Sync.status}"></span><span data-sync-detail>${M.Sync.label()}</span></p>
          <p class="muted small">Everything works offline and is saved on this device first. To keep several devices in step, connect your own sync endpoint (see README). Until then, use Export / Import to move your data.</p>
          <form class="form" id="sync-form">
            <label class="field"><span>Sync provider</span><select id="sy-ad"><option value="none" ${s.sync.adapter === 'none' ? 'selected' : ''}>None — this device only</option><option value="rest" ${s.sync.adapter === 'rest' ? 'selected' : ''}>My HTTPS endpoint (JSON GET/PUT)</option></select></label>
            <div id="sy-rest" ${s.sync.adapter === 'rest' ? '' : 'hidden'}>
              <label class="field"><span>Endpoint URL</span><input id="sy-url" type="url" placeholder="https://your-worker.example.com/journey" value="${U.esc(s.sync.endpoint)}"></label>
              <label class="field"><span>Access token (optional)</span><input id="sy-tok" type="password" autocomplete="off" value="${U.esc(s.sync.token)}"></label>
            </div>
            <div class="row gap wrap"><button class="btn sm primary">Save sync settings</button><button type="button" class="btn sm ghost" data-sync-now ${M.Sync.configured() ? '' : 'disabled'}>${U.icon('cloud')} Sync now</button></div>
            ${s.sync.lastSyncAt ? `<p class="muted small">Last synced ${new Date(s.sync.lastSyncAt).toLocaleString()}</p>` : ''}
          </form>
        </section>

        <section class="panel">
          <h2 class="h3">Privacy & data</h2>
          <p class="muted small">Your journal is private. Data is stored on this device (${U.esc(M.Storage.backend === 'indexeddb' ? 'IndexedDB' : M.Storage.backend === 'localStorage' ? 'local storage' : 'memory only — export before closing')}) and only leaves it if you export or connect sync.</p>
          <div class="row gap wrap">
            <button class="btn ghost" data-export-json>${U.icon('download')} Export my data (JSON)</button>
            <button class="btn ghost" data-export-csv>${U.icon('download')} Sessions (CSV)</button>
            <button class="btn ghost" data-copy-json>${U.icon('copy')} Copy backup</button>
            <label class="btn ghost file-btn">${U.icon('upload')} Import my data<input type="file" id="imp-file" accept="application/json,.json"></label>
            <button class="btn ghost" data-import-paste>Paste backup</button>
          </div>
          <div class="danger-zone"><div><p class="strong">Delete all data</p><p class="muted small">Removes every session, goal, journal entry and setting from this device.</p></div><button class="btn danger" data-delete-all>${U.icon('trash')} Delete all data</button></div>
        </section>

        <section class="panel">
          <h2 class="h3">App lock</h2>
          <p class="muted small">A PIN screen for privacy on a shared device. It hides the app; it does not encrypt the data.</p>
          <div class="row gap wrap center">
            <button class="btn ghost" data-pin-set>${U.icon('lock')} ${s.pinHash ? 'Change PIN' : 'Set a PIN'}</button>
            ${s.pinHash ? `<button class="btn ghost" data-pin-off>Remove PIN</button>
            <label class="field inline"><span>Lock after</span><select id="st-lockafter">${[0, 1, 5, 15, 60].map((m) => `<option value="${m}" ${s.lockAfterMin === m ? 'selected' : ''}>${m ? m + ' min away' : 'every time'}</option>`).join('')}</select></label>` : ''}
          </div>
        </section>

        <section class="panel soft">
          <h2 class="h3">Install</h2>
          <p class="muted small">Add the app to your home screen for full-screen prayer and offline use. On iPhone: Share → Add to Home Screen.</p>
          <button class="btn ghost" data-install ${M.PWA && M.PWA.canInstall() ? '' : 'disabled'}>Install app</button>
          <p class="muted small about">Based on <em>Money Doesn’t Deserve My Time</em> by Alouet Appolinaire Ndehem. Scripture translations are noted beside each verse.</p>
        </section>`;
      S.bindView(root);
    },

    bindView(root) {
      const s = M.state.settings;
      const save = (patch, rerender = true) => { M.Storage.saveSettings(patch); S.apply(); if (rerender) S.render(root); };
      U.$$('[data-mode-set]', root).forEach((b) => b.onclick = () => save({ mode: b.dataset.modeSet }));
      U.$$('[data-theme-set]', root).forEach((b) => b.onclick = () => save({ theme: b.dataset.themeSet, customAccent: '', mode: b.dataset.themeSet === 'heaven' && s.mode === 'dark' ? 'light' : s.mode }));
      U.$('#st-accent', root).onchange = (e) => save({ customAccent: e.target.value });
      const ac = U.$('[data-accent-clear]', root); if (ac) ac.onclick = () => save({ customAccent: '' });
      U.$$('[data-motion-set]', root).forEach((b) => b.onclick = () => save({ motion: b.dataset.motionSet }));
      U.$$('[data-pair]', root).forEach((b) => b.onclick = () => { const p = b.dataset.pair.split('|'); save({ fontDisplay: p[1], fontUI: p[2], fontNum: p[3] }); U.toast(p[0] + ' fonts applied.'); });
      U.$('#st-fd', root).onchange = (e) => save({ fontDisplay: e.target.value });
      U.$('#st-fu', root).onchange = (e) => save({ fontUI: e.target.value });
      U.$('#st-fn', root).onchange = (e) => save({ fontNum: e.target.value });
      U.$$('[data-fs]', root).forEach((b) => b.onclick = () => save({ fontScale: +b.dataset.fs }));
      U.$$('[data-target]', root).forEach((b) => b.onclick = () => {
        let v = b.dataset.target === 'custom' ? +U.$('#st-target', root).value : +b.dataset.target;
        if (!v || v < 5) return U.toast('Enter at least 5 minutes.', 'warn');
        const g = M.Goals.active(); g.dailyTargetMin = v; M.Storage.saveGoal(g);
        save({ dailyTargetMin: v }); U.toast('Daily target set to ' + U.hm(v * 60000) + '.');
      });
      U.$$('[data-win]', root).forEach((i) => i.onchange = () => { const w = s.windows.slice(); w[+i.dataset.win] = i.value; save({ windows: w }, false); });
      U.$$('[data-win-del]', root).forEach((b) => b.onclick = () => { const w = s.windows.slice(); w.splice(+b.dataset.winDel, 1); save({ windows: w }); });
      U.$('[data-win-add]', root).onclick = () => save({ windows: (s.windows || []).concat(['12:00']) });
      U.$('#st-prompts', root).onchange = (e) => save({ prompts: e.target.checked }, false);
      U.$('#st-opening', root).onchange = (e) => save({ openingExperience: e.target.checked }, false);
      U.$('#st-awake', root).onchange = (e) => save({ keepAwake: e.target.checked }, false);
      U.$$('[data-sound]', root).forEach((b) => b.onclick = () => { save({ sound: b.dataset.sound }); if (M.Sound.playing) M.Sound.play(b.dataset.sound); });
      U.$('#st-vol', root).oninput = (e) => { M.state.settings.volume = +e.target.value; M.Sound.setVolume(+e.target.value); };
      U.$('#st-vol', root).onchange = () => save({}, false);
      U.$('[data-sound-test]', root).onclick = () => { if (M.Sound.playing) M.Sound.stop(); else M.Sound.play(s.sound === 'silent' ? 'ambience' : s.sound); setTimeout(() => S.render(root), 50); };
      // reminders
      const rem = () => Object.assign({}, s.reminders);
      U.$('#st-rem', root).onchange = async (e) => { const r = rem(); r.enabled = e.target.checked; if (r.enabled && M.Notifications.permission() === 'default') await M.Notifications.request(); save({ reminders: r }); };
      U.$$('[data-rem]', root).forEach((i) => i.onchange = () => { const r = rem(); r.times = r.times.slice(); r.times[+i.dataset.rem] = i.value; save({ reminders: r }, false); });
      U.$$('[data-rem-del]', root).forEach((b) => b.onclick = () => { const r = rem(); r.times = r.times.filter((_, i) => i !== +b.dataset.remDel); save({ reminders: r }); });
      U.$('[data-rem-add]', root).onclick = () => { const r = rem(); r.times = r.times.concat(['12:00']); save({ reminders: r }); };
      U.$$('[data-rem-day]', root).forEach((b) => b.onclick = () => { const r = rem(); const d = +b.dataset.remDay; r.days = r.days.includes(d) ? r.days.filter((x) => x !== d) : r.days.concat([d]); save({ reminders: r }); });
      U.$('[data-notif-perm]', root).onclick = async () => { await M.Notifications.request(); S.render(root); };
      U.$('[data-notif-test]', root).onclick = () => M.Notifications.show(M.Notifications.message());
      U.$('[data-ics]', root).onclick = () => M.Notifications.ics();
      // sync
      U.$('#sy-ad', root).onchange = (e) => { U.$('#sy-rest', root).hidden = e.target.value !== 'rest'; };
      U.$('#sync-form', root).onsubmit = (e) => {
        e.preventDefault();
        const ad = U.$('#sy-ad', root).value; const url = (U.$('#sy-url', root) || {}).value || ''; const tok = (U.$('#sy-tok', root) || {}).value || '';
        if (ad === 'rest' && !/^https:\/\//.test(url)) return U.toast('Enter an https:// endpoint URL.', 'warn');
        save({ sync: Object.assign({}, s.sync, { adapter: ad, endpoint: url.trim(), token: tok }) });
        M.Sync.init(); U.toast(ad === 'none' ? 'Sync turned off. Data stays on this device.' : 'Sync settings saved.');
      };
      U.$('[data-sync-now]', root).onclick = async () => { const ok = await M.Sync.syncNow(); U.toast(ok ? 'Synced.' : 'Could not sync — your data is safe on this device.', ok ? '' : 'warn'); };
      // data
      U.$('[data-export-json]', root).onclick = () => S.exportJSON();
      U.$('[data-export-csv]', root).onclick = () => S.exportCSV();
      U.$('[data-copy-json]', root).onclick = async () => { const ok = await U.copy(JSON.stringify(M.Storage.exportData(), null, 2)); U.toast(ok ? 'Backup copied. Paste it somewhere safe.' : 'Copy is not available here.'); };
      U.$('#imp-file', root).onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => S.importText(rd.result); rd.onerror = () => U.toast('Could not read that file.', 'warn'); rd.readAsText(f); e.target.value = ''; };
      U.$('[data-import-paste]', root).onclick = () => {
        const m = U.modal(`<h3 class="modal-title">Paste a backup</h3><label class="field"><span>Backup JSON</span><textarea id="imp-txt" rows="8"></textarea></label><div class="row end"><button class="btn primary" data-imp-go>Continue</button></div>`, { label: 'Import' });
        U.$('[data-imp-go]', m).onclick = () => S.importText(U.$('#imp-txt', m).value);
      };
      U.$('[data-delete-all]', root).onclick = () => S.deleteAll();
      // PIN
      U.$('[data-pin-set]', root).onclick = () => S.pinEditor();
      const po = U.$('[data-pin-off]', root); if (po) po.onclick = async () => { if (await U.confirm('Remove the PIN?', 'The app will open without a lock screen.', { ok: 'Remove PIN' })) save({ pinHash: '', pinSalt: '' }); };
      const la = U.$('#st-lockafter', root); if (la) la.onchange = (e) => save({ lockAfterMin: +e.target.value }, false);
      const ib = U.$('[data-install]', root); if (ib) ib.onclick = () => M.PWA.install();
    },

    exportJSON() {
      const txt = JSON.stringify(M.Storage.exportData(), null, 2);
      if (U.download('money-doesnt-deserve-my-time-backup.json', txt)) U.toast('Backup downloaded.');
      else U.copy(txt).then((ok) => U.toast(ok ? 'Download blocked here — backup copied to clipboard instead.' : 'Export unavailable here.'));
    },
    exportCSV() {
      const rows = [['date', 'start', 'end', 'duration_minutes', 'title', 'category', 'journey', 'sown', 'tags', 'notes']];
      M.Storage.getSessions().forEach((s) => {
        const g = M.Storage.getGoal(s.goalId);
        rows.push([U.dayKey(s.start), U.fmtTime(s.start), U.fmtTime(s.end || s.start + s.durationMs), (s.durationMs / 60000).toFixed(1), s.title || '', M.Prayer.modeLabel(s.mode), g ? g.name : '', (s.sown || []).join('; '), (s.tags || []).join('; '), s.notes || '']);
      });
      const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      if (U.download('prayer-sessions.csv', csv, 'text/csv')) U.toast('Sessions exported.');
      else U.copy(csv).then((ok) => U.toast(ok ? 'CSV copied to clipboard.' : 'Export unavailable here.'));
    },
    importText(txt) {
      let obj;
      try { obj = JSON.parse(txt); } catch (e) { return U.toast('That is not valid JSON.', 'warn'); }
      if (!obj || !Array.isArray(obj.sessions) || !Array.isArray(obj.goals)) return U.toast('This file is not a valid backup (sessions and goals are missing).', 'warn');
      const n = obj.sessions.filter((s) => !s.deleted).length;
      const m = U.modal(`<h3 class="modal-title">Import ${n} session${n === 1 ? '' : 's'}?</h3>
        <p class="muted">Merge keeps everything on this device and adds what is new (newest version wins). Replace swaps all current data for the backup.</p>
        <div class="row end gap wrap"><button class="btn ghost" data-close>Cancel</button><button class="btn ghost" data-imp="replace">Replace</button><button class="btn primary" data-imp="merge">Merge</button></div>`, { label: 'Import' });
      U.$$('[data-imp]', m).forEach((b) => b.onclick = () => {
        try { M.Storage.importData(obj, b.dataset.imp); U.closeModal(); S.apply(); M.Achievements.check(true); U.toast('Import complete.'); M.App.refresh(); }
        catch (e) { U.toast(e.message || 'Import failed. Your data was not changed.', 'warn'); }
      });
    },
    deleteAll() {
      const m = U.modal(`<h3 class="modal-title">Delete all data?</h3><p class="muted">This permanently removes every session, journey, journal entry, testimony and setting from this device. Export a backup first if you may want it back.</p>
        <label class="field"><span>Type DELETE to confirm</span><input id="del-confirm" autocomplete="off"></label>
        <div class="row end gap"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" data-del-go disabled>Delete everything</button></div>`, { label: 'Delete all data' });
      const inp = U.$('#del-confirm', m), go = U.$('[data-del-go]', m);
      inp.oninput = () => { go.disabled = inp.value.trim() !== 'DELETE'; };
      go.onclick = async () => { M.Timer.discard(); await M.Storage.deleteAll(); U.closeModal(); S.apply(); U.toast('All data deleted.'); M.App.go('dashboard'); };
    },
    pinEditor() {
      const m = U.modal(`<h3 class="modal-title">Set a PIN</h3><form class="form" id="pin-form">
        <label class="field"><span>New PIN (4–8 digits)</span><input id="pin1" inputmode="numeric" pattern="[0-9]{4,8}" type="password" autocomplete="new-password" required></label>
        <label class="field"><span>Repeat PIN</span><input id="pin2" inputmode="numeric" type="password" autocomplete="new-password" required></label>
        <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save PIN</button></div></form>`, { label: 'Set PIN' });
      U.$('#pin-form', m).onsubmit = async (e) => {
        e.preventDefault();
        const a = U.$('#pin1', m).value, b = U.$('#pin2', m).value;
        if (!/^\d{4,8}$/.test(a)) return U.toast('Use 4 to 8 digits.', 'warn');
        if (a !== b) return U.toast('The PINs do not match.', 'warn');
        const salt = U.uid('s'); const h = await hash(a, salt);
        M.Storage.saveSettings({ pinHash: h, pinSalt: salt }); U.closeModal(); U.toast('PIN set.'); M.App.refresh();
      };
    },

    /* ---------------- lock screen ---------------- */
    hiddenAt: 0,
    initLock() {
      document.addEventListener('visibilitychange', () => {
        const s = M.state.settings; if (!s.pinHash) return;
        if (document.hidden) S.hiddenAt = Date.now();
        else if (S.hiddenAt && Date.now() - S.hiddenAt >= (s.lockAfterMin || 0) * 60000) S.lock();
      });
      if (M.state.settings.pinHash) S.lock();
    },
    lock() {
      if (U.$('#lock')) return;
      const el = document.createElement('div'); el.id = 'lock'; el.className = 'lock';
      el.innerHTML = `<form class="lock-card" id="lock-form"><div class="lock-ico">${U.icon('lock')}</div><p class="eyebrow">Private</p><h2 class="h2">Enter your PIN</h2>
        <label class="sr-only" for="lock-pin">PIN</label><input id="lock-pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8">
        <button class="btn primary">Unlock</button><p class="muted small" id="lock-msg"></p></form>`;
      document.body.appendChild(el); document.body.classList.add('locked');
      const inp = U.$('#lock-pin', el); setTimeout(() => inp.focus(), 50);
      let tries = 0;
      U.$('#lock-form', el).onsubmit = async (e) => {
        e.preventDefault();
        const s = M.state.settings;
        if (await hash(inp.value, s.pinSalt) === s.pinHash) { el.remove(); document.body.classList.remove('locked'); }
        else { tries++; inp.value = ''; U.$('#lock-msg', el).textContent = tries >= 5 ? 'Forgot it? Clearing this site’s data in your browser resets the app (and erases its local data), then you can import a backup.' : 'That PIN is not correct.'; }
      };
    }
  };

  M.Settings = S;
})(window.MDT = window.MDT || {});
