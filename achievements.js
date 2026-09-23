/* ==========================================================================
   achievements.js — badges, milestone celebrations, completion trigger
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const H = 3600000;

  const DEFS = [
    { id: 'first-seed', name: 'First Seed', desc: 'Complete your first 10 minutes.', icon: 'seed', test: (s) => s.totalMs >= 10 * 60000 },
    { id: 'rooted', name: 'Rooted', desc: 'Complete 1 hour.', icon: 'drop', test: (s) => s.totalMs >= H },
    { id: 'first-harvest', name: 'First Harvest', desc: 'Complete 5 hours.', icon: 'gift', test: (s) => s.totalMs >= 5 * H },
    { id: 'deep-roots', name: 'Deep Roots', desc: 'Complete 10 hours.', icon: 'seed', test: (s) => s.totalMs >= 10 * H },
    { id: 'faithful', name: 'Faithful', desc: 'Pray 7 days in a row.', icon: 'flame', test: (s) => s.bestStreak >= 7 },
    { id: 'watchman', name: 'The Watchman', desc: 'Complete 25 hours.', icon: 'eye', test: (s) => s.totalMs >= 25 * H },
    { id: 'seeker', name: 'The Seeker', desc: 'Complete 40 hours.', icon: 'compass', test: (s) => s.totalMs >= 40 * H },
    { id: 'abundant', name: 'Abundant', desc: 'Complete 50 hours.', icon: 'sparkle', test: (s) => s.totalMs >= 50 * H },
    { id: 'sown-58', name: '58 Hours Sown', desc: 'Complete the entire journey.', icon: 'crown', test: (s) => s.goalsCompleted >= 1 },
    { id: 'altar', name: 'Altar Builder', desc: 'Complete 30 prayer sessions.', icon: 'flame', test: (s) => s.sessions >= 30 },
    { id: 'early', name: 'Early Seeker', desc: 'Complete 5 morning sessions (04:00–09:59).', icon: 'sun', test: (s) => s.morning >= 5 },
    { id: 'night', name: 'Night Watch', desc: 'Complete 5 night sessions (21:00–03:59).', icon: 'moon', test: (s) => s.night >= 5 },
    { id: 'consistent', name: 'Consistent', desc: 'Complete 14 consecutive days.', icon: 'calendar', test: (s) => s.bestStreak >= 14 }
  ];

  const MILESTONES_58 = [1, 5, 10, 20, 30, 40, 50, 55];
  const MSG = {
    1: 'The first hour has been sown.', 5: '5 hours have been sown.', 10: '10 hours have been sown.', 20: '20 hours have been sown.',
    30: '30 hours have been sown.', 40: '40 hours have been sown.', 50: '50 hours have been sown.', 55: '55 hours. The end of this season is in sight.'
  };

  const A = {
    DEFS,
    unlocked() { return M.state.achievements.unlocked; },
    /** Check badges; returns newly unlocked defs */
    check(silent) {
      const st = M.Analytics.stats();
      const u = M.state.achievements.unlocked; const fresh = [];
      DEFS.forEach((d) => { if (!u[d.id] && d.test(st)) { u[d.id] = Date.now(); fresh.push(d); } });
      if (fresh.length) {
        M.Storage.touch('achievements');
        if (!silent) fresh.forEach((d, i) => setTimeout(() => A.toast(d), 600 + i * 1600));
      }
      return fresh;
    },
    toast(d) {
      const host = U.$('#toasts'); if (!host) return;
      const el = document.createElement('div');
      el.className = 'toast badge-toast'; el.setAttribute('role', 'status');
      el.innerHTML = `<span class="badge-ico sm">${U.icon(d.icon)}</span><span><strong>${U.esc(d.name)}</strong><br><span class="muted small">${U.esc(d.desc)}</span></span>`;
      host.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 400); }, 4200);
    },

    /** Milestone thresholds (hours) for a goal, scaled for non-58 goals */
    thresholds(goal) {
      if (!M.Goals.isTimeBased(goal)) return [];
      if (+goal.target === 58) return MILESTONES_58;
      const T = +goal.target;
      return [0.02, 0.1, 0.25, 0.5, 0.75, 0.9].map((f) => Math.max(1, Math.round(T * f))).filter((v, i, a) => a.indexOf(v) === i && v < T);
    },
    /**
     * Compare progress before/after a change. Shows the highest newly crossed
     * milestone (one celebration at a time) or the completion experience.
     */
    afterProgress(goal, beforeMs, afterMs, beforeP, afterP) {
      const meta = M.state.meta;
      meta.milestones[goal.id] = meta.milestones[goal.id] || [];
      const shown = meta.milestones[goal.id];
      if (!beforeP.complete && afterP.complete && !meta.completedGoals[goal.id]) {
        meta.completedGoals[goal.id] = Date.now(); M.Storage.touch('meta');
        A.check();
        setTimeout(() => M.Viz.completion(goal), 400);
        return 'complete';
      }
      if (!M.Goals.isTimeBased(goal)) return null;
      const crossed = A.thresholds(goal).filter((h) => beforeMs < h * H && afterMs >= h * H && !shown.includes(h));
      if (crossed.length) {
        const h = crossed[crossed.length - 1];
        crossed.forEach((x) => shown.push(x)); M.Storage.touch('meta');
        setTimeout(() => M.Viz.celebrate(h + (h === 1 ? ' HOUR' : ' HOURS'), MSG[h] && +goal.target === 58 ? MSG[h] : h + ' hours have been sown.', afterP.pct), 400);
        return 'milestone';
      }
      return null;
    },

    render(root) {
      const u = A.unlocked();
      const n = Object.keys(u).length;
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Achievements</p>
          <h1 class="view-title">${n ? n + ' of ' + DEFS.length + ' earned' : 'The journey has just begun.'}</h1>
          <p class="lede">Markers along the way — not the destination. The destination is God Himself.</p>
        </header>
        <section class="badge-grid">
          ${DEFS.map((d) => `<article class="badge ${u[d.id] ? 'earned' : 'locked'}" aria-label="${U.esc(d.name)} ${u[d.id] ? 'earned' : 'locked'}">
            <span class="badge-ico">${U.icon(u[d.id] ? d.icon : 'lock')}</span>
            <h3 class="badge-name">${U.esc(d.name)}</h3>
            <p class="muted small">${U.esc(d.desc)}</p>
            <p class="badge-state small">${u[d.id] ? 'Earned ' + U.fmtDate(u[d.id], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not yet'}</p>
          </article>`).join('')}
        </section>`;
    }
  };

  M.Achievements = A;
})(window.MDT = window.MDT || {});
