/* ==========================================================================
   goals.js — journeys (goals): progress math + Goals view (create/edit/…)
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const UNITS = { hours: 'Hours', days: 'Days', sessions: 'Sessions', custom: 'Custom' };
  const TEMPLATES = [
    { name: '100 Hours of Prayer', unit: 'hours', target: 100, dailyTargetMin: 120, purpose: '', theme: 'Prayer', scripture: 'Philippians 3:13-14' },
    { name: '30 Hours of Intercession', unit: 'hours', target: 30, dailyTargetMin: 60, purpose: '', theme: 'Intercession', scripture: '' },
    { name: '21 Days of Seeking God', unit: 'days', target: 21, dailyTargetMin: 60, purpose: '', theme: 'Seeking God', scripture: 'Proverbs 8:17' },
    { name: '1,000 Hours With God', unit: 'hours', target: 1000, dailyTargetMin: 720, purpose: 'The larger pursuit of wisdom described in the book.', theme: 'Wisdom', scripture: 'Proverbs 4:7' }
  ];

  const Goals = {
    UNITS,
    all() { return M.Storage.getGoals().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); },
    active() { return M.Storage.getGoals().find((g) => g.status === 'active') || M.Storage.getGoals()[0]; },
    unitLabel(g) { return g.unit === 'custom' ? (g.customUnit || 'hours') : g.unit; },
    isTimeBased(g) { return g.unit === 'hours' || g.unit === 'custom'; },
    dailyTargetMs(g) { return ((g && g.dailyTargetMin) || M.state.settings.dailyTargetMin || 120) * 60000; },

    /** Progress for a goal. extraMs = live (unsaved) timer time to include. */
    progress(g, extraMs = 0) {
      g = g || Goals.active();
      const sessions = M.Storage.getSessions(g.id);
      const doneMs = sessions.reduce((a, s) => a + s.durationMs, 0) + extraMs;
      let value, target = Number(g.target) || 1;
      if (g.unit === 'days') value = new Set(sessions.map((s) => U.dayKey(s.start))).size + (extraMs && !sessions.some((s) => U.dayKey(s.start) === U.dayKey(Date.now())) ? 1 : 0);
      else if (g.unit === 'sessions') value = sessions.length;
      else value = doneMs / U.HOUR;
      const pct = U.clamp(value / target, 0, 1);
      const targetMs = Goals.isTimeBased(g) ? target * U.HOUR : null;
      return {
        goal: g, value, target, pct, doneMs, sessions: sessions.length,
        targetMs, remainingMs: targetMs != null ? Math.max(0, targetMs - doneMs) : null,
        complete: value >= target
      };
    },
    /** "21h 32m" or "12 days" style display of done value */
    fmtValue(p) {
      if (Goals.isTimeBased(p.goal)) return U.hm(p.doneMs);
      return Math.floor(p.value) + ' ' + Goals.unitLabel(p.goal);
    },
    fmtRemaining(p) {
      if (Goals.isTimeBased(p.goal)) return U.hm(p.remainingMs);
      return Math.max(0, Math.ceil(p.target - p.value)) + ' ' + Goals.unitLabel(p.goal);
    },
    title(g) {
      g = g || Goals.active();
      return g.name;
    },

    activate(id) {
      M.Storage.getGoals().forEach((g) => {
        if (g.id === id) { g.status = 'active'; M.Storage.saveGoal(g); }
        else if (g.status === 'active') { g.status = 'idle'; M.Storage.saveGoal(g); }
      });
    },
    create(data) {
      const now = Date.now();
      const g = Object.assign({ id: U.uid('goal'), status: 'idle', createdAt: now, startDate: U.dayKey(now), unit: 'hours', target: 58, dailyTargetMin: 120 }, data);
      M.Storage.saveGoal(g);
      return g;
    },

    /* ---------------- view ---------------- */
    render(root) {
      const goals = Goals.all();
      const live = goals.filter((g) => g.status !== 'archived');
      const archived = goals.filter((g) => g.status === 'archived');
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Journeys</p>
          <h1 class="view-title">Your goals</h1>
          <p class="lede">The 58-hour journey is one focused season inside a larger pursuit of wisdom. Create other journeys when you are ready.</p>
          <div class="row gap wrap"><button class="btn primary" data-goal-new>${U.icon('plus')} New journey</button></div>
        </header>
        <section class="goal-list">${live.map(card).join('')}</section>
        <section class="panel soft">
          <h2 class="h3">Start from a template</h2>
          <div class="chip-row">${TEMPLATES.map((t, i) => `<button class="chip" data-goal-tpl="${i}">${U.esc(t.name)}</button>`).join('')}</div>
        </section>
        ${archived.length ? `<section><h2 class="h3 muted">Archived</h2><div class="goal-list">${archived.map(card).join('')}</div></section>` : ''}`;

      U.$$('[data-goal-new]', root).forEach((b) => b.onclick = () => Goals.editor());
      U.$$('[data-goal-tpl]', root).forEach((b) => b.onclick = () => Goals.editor(Object.assign({}, TEMPLATES[+b.dataset.goalTpl]), true));
      U.on(root, 'click', '[data-goal-act]', async (e, b) => {
        const g = M.Storage.getGoal(b.dataset.id); if (!g) return;
        const act = b.dataset.goalAct;
        if (act === 'activate') { Goals.activate(g.id); U.toast('“' + g.name + '” is now your active journey.'); }
        if (act === 'edit') return Goals.editor(g);
        if (act === 'dup') { const c = Object.assign({}, g, { id: U.uid('goal'), name: g.name + ' (copy)', status: 'idle', createdAt: Date.now() }); delete c.deleted; M.Storage.saveGoal(c); U.toast('Journey duplicated.'); }
        if (act === 'archive') {
          if (g.status === 'active') return U.toast('Activate another journey before archiving this one.', 'warn');
          g.status = g.status === 'archived' ? 'idle' : 'archived'; M.Storage.saveGoal(g);
        }
        if (act === 'delete') {
          if (g.status === 'active') return U.toast('Activate another journey before deleting this one.', 'warn');
          const ok = await U.confirm('Delete “' + g.name + '”?', 'The journey is removed. Its prayer sessions stay in your history.', { ok: 'Delete journey', danger: true });
          if (!ok) return;
          M.Storage.remove('goals', g.id); U.toast('Journey deleted.');
        }
        M.App.refresh();
      });

      function card(g) {
        const p = Goals.progress(g);
        const isActive = g.status === 'active';
        return `<article class="goal-card ${isActive ? 'is-active' : ''}" style="${g.color ? '--goal:' + U.esc(g.color) : ''}">
          <div class="goal-top">
            <div>
              <p class="eyebrow">${isActive ? '<span class="pill accent">Active</span>' : g.status === 'archived' ? '<span class="pill">Archived</span>' : ''} ${U.esc(UNITS[g.unit] || 'Hours')}${g.theme ? ' · ' + U.esc(g.theme) : ''}</p>
              <h3 class="goal-name">${U.esc(g.name)}</h3>
              ${g.purpose ? `<p class="muted small">${U.esc(g.purpose)}</p>` : ''}
            </div>
            <div class="goal-num tnum"><strong>${Math.floor(p.pct * 100)}%</strong><span class="muted small">${U.esc(Goals.fmtValue(p))} / ${g.target} ${U.esc(Goals.unitLabel(g))}</span></div>
          </div>
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(p.pct * 100)}" aria-label="${U.esc(g.name)} progress"><span style="width:${p.pct * 100}%"></span></div>
          ${g.scripture ? `<p class="scripture-ref small">${U.esc(g.scripture)}</p>` : ''}
          <div class="row gap wrap goal-actions">
            ${!isActive && g.status !== 'archived' ? `<button class="btn sm primary" data-goal-act="activate" data-id="${g.id}">Activate</button>` : ''}
            <button class="btn sm ghost" data-goal-act="edit" data-id="${g.id}">${U.icon('edit')} Edit</button>
            <button class="btn sm ghost" data-goal-act="dup" data-id="${g.id}">${U.icon('dup')} Duplicate</button>
            <button class="btn sm ghost" data-goal-act="archive" data-id="${g.id}">${U.icon('archive')} ${g.status === 'archived' ? 'Restore' : 'Archive'}</button>
            <button class="btn sm ghost danger-text" data-goal-act="delete" data-id="${g.id}">${U.icon('trash')} Delete</button>
          </div>
        </article>`;
      }
    },

    /** Create / edit form */
    editor(g, isTemplate) {
      const isNew = !g || isTemplate || !g.id;
      g = Object.assign({ name: '', unit: 'hours', target: 58, customUnit: '', startDate: U.dayKey(Date.now()), targetDate: '', dailyTargetMin: 120, purpose: '', scripture: '', theme: '', color: '' }, g || {});
      const m = U.modal(`
        <h3 class="modal-title">${isNew ? 'New journey' : 'Edit journey'}</h3>
        <form class="form" id="goal-form">
          <label class="field"><span>Goal name</span><input id="g-name" required value="${U.esc(g.name)}" placeholder="e.g. 100 Hours of Prayer"></label>
          <div class="grid2">
            <label class="field"><span>Target</span><input id="g-target" type="number" min="1" step="1" required value="${U.esc(g.target)}"></label>
            <label class="field"><span>Unit</span><select id="g-unit">${Object.keys(UNITS).map((u) => `<option value="${u}" ${g.unit === u ? 'selected' : ''}>${UNITS[u]}</option>`).join('')}</select></label>
          </div>
          <label class="field" id="g-custom-wrap" ${g.unit === 'custom' ? '' : 'hidden'}><span>Custom unit name (counted in hours of prayer)</span><input id="g-custom" value="${U.esc(g.customUnit)}" placeholder="e.g. watches"></label>
          <div class="grid2">
            <label class="field"><span>Start date</span><input id="g-start" type="date" value="${U.esc(g.startDate)}"></label>
            <label class="field"><span>Target date</span><input id="g-end" type="date" value="${U.esc(g.targetDate)}"></label>
          </div>
          <label class="field"><span>Daily target (minutes)</span><input id="g-daily" type="number" min="5" step="5" value="${U.esc(g.dailyTargetMin)}"></label>
          <label class="field"><span>Description / purpose</span><textarea id="g-purpose" rows="2" placeholder="What is this season for?">${U.esc(g.purpose)}</textarea></label>
          <div class="grid2">
            <label class="field"><span>Primary Scripture</span><input id="g-scripture" value="${U.esc(g.scripture)}" placeholder="e.g. Proverbs 4:7"></label>
            <label class="field"><span>Theme</span><input id="g-theme" value="${U.esc(g.theme)}" placeholder="e.g. Wisdom"></label>
          </div>
          <label class="field inline"><span>Color</span><input id="g-color" type="color" value="${U.esc(g.color || '#d4ae62')}"><button type="button" class="btn sm ghost" id="g-color-clear">Use theme color</button></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" type="submit">${isNew ? 'Create journey' : 'Save changes'}</button></div>
        </form>`, { label: 'Journey editor' });
      let useColor = !!g.color;
      U.$('#g-unit', m).onchange = (e) => { U.$('#g-custom-wrap', m).hidden = e.target.value !== 'custom'; };
      U.$('#g-color', m).oninput = () => { useColor = true; };
      U.$('#g-color-clear', m).onclick = () => { useColor = false; U.toast('The journey will use the app theme color.'); };
      U.$('#goal-form', m).onsubmit = (e) => {
        e.preventDefault();
        const data = {
          name: U.$('#g-name', m).value.trim() || 'Untitled journey', target: Math.max(1, +U.$('#g-target', m).value || 1),
          unit: U.$('#g-unit', m).value, customUnit: U.$('#g-custom', m).value.trim(), startDate: U.$('#g-start', m).value,
          targetDate: U.$('#g-end', m).value, dailyTargetMin: Math.max(5, +U.$('#g-daily', m).value || 60),
          purpose: U.$('#g-purpose', m).value.trim(), scripture: U.$('#g-scripture', m).value.trim(), theme: U.$('#g-theme', m).value.trim(),
          color: useColor ? U.$('#g-color', m).value : ''
        };
        if (isNew) { const ng = Goals.create(data); U.closeModal(); U.toast('Journey created.'); offerActivate(ng); }
        else { Object.assign(g, data); M.Storage.saveGoal(g); U.closeModal(); U.toast('Journey saved.'); }
        M.App.refresh();
      };
    }
  };

  function offerActivate(g) {
    U.confirm('Make it your active journey?', '“' + g.name + '” will appear across the app and new sessions will count toward it.', { ok: 'Activate' })
      .then((ok) => { if (ok) { Goals.activate(g.id); M.App.refresh(); } });
  }
  Goals.offerActivate = offerActivate;

  M.Goals = Goals;
})(window.MDT = window.MDT || {});
