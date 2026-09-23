/* ==========================================================================
   analytics.js — statistics, streaks, projections and SVG charts
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const H = 3600000;

  function dayTotals(sessions) {
    const map = new Map();
    sessions.forEach((s) => { const k = U.dayKey(s.start); map.set(k, (map.get(k) || 0) + s.durationMs); });
    return map;
  }
  function streaks(keys) {
    const set = new Set(keys);
    let cur = 0; let d = Date.now();
    if (!set.has(U.dayKey(d))) d = U.addDays(d, -1);
    while (set.has(U.dayKey(d))) { cur++; d = U.addDays(d, -1); }
    const sorted = Array.from(set).sort();
    let best = 0, run = 0, prev = null;
    sorted.forEach((k) => {
      const [y, m, dd] = k.split('-').map(Number); const ts = new Date(y, m - 1, dd).getTime();
      run = prev != null && Math.round((ts - prev) / U.DAY) === 1 ? run + 1 : 1;
      best = Math.max(best, run); prev = ts;
    });
    return { current: cur, best: Math.max(best, cur) };
  }

  const A = {
    dayTotals,
    stats() {
      const ss = M.Storage.getSessions();
      const totalMs = ss.reduce((a, s) => a + s.durationMs, 0);
      const days = dayTotals(ss);
      const st = streaks(Array.from(days.keys()));
      let morning = 0, night = 0, longest = 0;
      ss.forEach((s) => { const h = new Date(s.start).getHours(); if (h >= 4 && h < 10) morning++; if (h >= 21 || h < 4) night++; longest = Math.max(longest, s.durationMs); });
      return {
        totalMs, sessions: ss.length, morning, night, longestMs: longest, avgSessionMs: ss.length ? totalMs / ss.length : 0,
        currentStreak: st.current, bestStreak: st.best, activeDays: days.size,
        goalsCompleted: Object.keys(M.state.meta.completedGoals || {}).length
      };
    },
    summary() { const s = A.stats(); const g = M.Goals.active(); const p = M.Goals.progress(g); return Object.assign({}, s, { activeGoal: g.name, activeGoalPct: Math.round(p.pct * 1000) / 10 }); },
    todayMs(extra = 0) { const k = U.dayKey(Date.now()); return M.Storage.getSessions().filter((s) => U.dayKey(s.start) === k).reduce((a, s) => a + s.durationMs, 0) + extra; },
    todaySessions() { const k = U.dayKey(Date.now()); return M.Storage.getSessions().filter((s) => U.dayKey(s.start) === k); },

    /** Projected completion for the active goal based on actual pace */
    projection(goal) {
      goal = goal || M.Goals.active();
      const ss = M.Storage.getSessions(goal.id);
      const p = M.Goals.progress(goal);
      if (p.complete) return { complete: true, p };
      if (!M.Goals.isTimeBased(goal)) {
        if (ss.length < 3) return null;
        const first = U.startOfDay(ss[0].start);
        const span = Math.max(1, Math.round((U.startOfDay(Date.now()) - first) / U.DAY) + 1);
        const perDay = p.value / span; if (perDay <= 0) return null;
        const days = Math.ceil((p.target - p.value) / perDay);
        return { p, perDayLabel: (Math.round(perDay * 10) / 10) + ' ' + M.Goals.unitLabel(goal) + '/day', days, weeks: days / 7, date: U.addDays(Date.now(), days) };
      }
      if (ss.length < 3) return null;
      const first = U.startOfDay(ss[0].start);
      const span = Math.round((U.startOfDay(Date.now()) - first) / U.DAY) + 1;
      if (span < 2) return null;
      const perDay = p.doneMs / span;
      if (perDay < 60000) return null;
      const days = Math.ceil(p.remainingMs / perDay);
      return { p, perDay, perDayLabel: U.hm(perDay) + '/day', days, weeks: days / 7, date: U.addDays(Date.now(), days) };
    },

    /* ---------------- charts (inline SVG, theme-token colors) ---------------- */
    weekBars(targetMs) {
      const now = new Date(); const dow = (now.getDay() + 6) % 7; // Monday=0
      const monday = U.startOfDay(U.addDays(Date.now(), -dow));
      const totals = dayTotals(M.Storage.getSessions());
      const days = Array.from({ length: 7 }, (_, i) => { const ts = U.addDays(monday, i); return { ts, ms: totals.get(U.dayKey(ts)) || 0, today: i === dow, future: i > dow }; });
      const max = Math.max(targetMs || 0, ...days.map((d) => d.ms), H);
      const W = 560, Ht = 200, pad = 28, bw = (W - pad * 2) / 7;
      const y = (v) => Ht - 30 - (v / max) * (Ht - 60);
      const ty = targetMs ? y(targetMs) : null;
      return `<svg class="chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Prayer time this week">
        ${ty != null ? `<line x1="${pad}" x2="${W - pad}" y1="${ty}" y2="${ty}" class="c-target"/><text x="${W - pad}" y="${ty - 5}" class="c-label" text-anchor="end">Daily target ${U.hm(targetMs)}</text>` : ''}
        <line x1="${pad}" x2="${W - pad}" y1="${Ht - 30}" y2="${Ht - 30}" class="c-axis"/>
        ${days.map((d, i) => {
          const x = pad + i * bw + bw * 0.22, w = bw * 0.56, yy = y(d.ms), h = Ht - 30 - yy;
          const met = targetMs && d.ms >= targetMs;
          return `<g><title>${U.fmtDate(d.ts, { weekday: 'long' })}: ${U.hm(d.ms)}</title>
            <rect x="${x}" y="${yy}" width="${w}" height="${Math.max(0, h)}" rx="3" class="c-bar ${d.today ? 'today' : ''} ${met ? 'met' : ''}"/>
            ${d.ms ? `<text x="${x + w / 2}" y="${yy - 6}" class="c-val" text-anchor="middle">${U.hm(d.ms)}</text>` : ''}
            <text x="${x + w / 2}" y="${Ht - 12}" class="c-label ${d.today ? 'strong' : ''}" text-anchor="middle">${U.fmtDate(d.ts, { weekday: 'short' })}</text></g>`;
        }).join('')}
      </svg>`;
    },
    cumulative(goal) {
      const ss = M.Storage.getSessions(goal.id);
      const W = 560, Ht = 200, padL = 36, padR = 16, padT = 16, padB = 28;
      if (!ss.length) return '<div class="empty small"><p class="muted">Your cumulative line appears after your first session.</p></div>';
      const start = U.startOfDay(Math.min(ss[0].start, Date.now()));
      const end = U.startOfDay(Date.now());
      const nDays = Math.max(1, Math.round((end - start) / U.DAY) + 1);
      const totals = dayTotals(ss);
      let acc = 0; const pts = [];
      for (let i = 0; i < nDays; i++) { acc += totals.get(U.dayKey(U.addDays(start, i))) || 0; pts.push(acc / H); }
      const maxV = Math.max(goal.target * 0.25, ...pts) * 1.1;
      const x = (i) => padL + (nDays === 1 ? (W - padL - padR) : i / (nDays - 1) * (W - padL - padR));
      const y = (v) => Ht - padB - v / maxV * (Ht - padT - padB);
      const line = pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
      const area = line + ` L${x(nDays - 1)} ${Ht - padB} L${x(0)} ${Ht - padB} Z`;
      const ticks = [0, 0.5, 1].map((f) => Math.round(maxV * f));
      return `<svg class="chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Cumulative hours sown">
        ${ticks.map((v) => `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="c-grid"/><text x="${padL - 6}" y="${y(v) + 4}" class="c-label" text-anchor="end">${v}h</text>`).join('')}
        <path d="${area}" class="c-area"/><path d="${line}" class="c-line"/>
        <circle cx="${x(nDays - 1)}" cy="${y(pts[pts.length - 1])}" r="4" class="c-dot"/>
        <text x="${x(nDays - 1)}" y="${y(pts[pts.length - 1]) - 10}" class="c-val" text-anchor="end">${U.hm(acc)}</text>
        <text x="${padL}" y="${Ht - 8}" class="c-label">${U.fmtDate(start, { month: 'short', day: 'numeric' })}</text>
        <text x="${W - padR}" y="${Ht - 8}" class="c-label" text-anchor="end">Today</text>
      </svg>`;
    },
    heatmap(weeks = 18) {
      const totals = dayTotals(M.Storage.getSessions());
      const target = M.Goals.dailyTargetMs(M.Goals.active());
      const today = U.startOfDay(Date.now());
      const dow = (new Date().getDay() + 6) % 7;
      const start = U.addDays(today, -(weeks - 1) * 7 - dow);
      const cell = 13, gap = 3, W = weeks * (cell + gap) + 30, Ht = 7 * (cell + gap) + 20;
      let cells = '';
      for (let w = 0; w < weeks; w++) {
        for (let d = 0; d < 7; d++) {
          const ts = U.addDays(start, w * 7 + d); if (ts > today) continue;
          const ms = totals.get(U.dayKey(ts)) || 0;
          const lvl = ms === 0 ? 0 : ms < target * 0.25 ? 1 : ms < target * 0.6 ? 2 : ms < target ? 3 : 4;
          cells += `<rect x="${30 + w * (cell + gap)}" y="${d * (cell + gap)}" width="${cell}" height="${cell}" rx="3" class="hm l${lvl}"><title>${U.fmtDate(ts, { weekday: 'short', month: 'short', day: 'numeric' })}: ${ms ? U.hm(ms) : 'no prayer logged'}</title></rect>`;
        }
      }
      const labels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((l, d) => l ? `<text x="0" y="${d * (cell + gap) + 10}" class="c-label">${l}</text>` : '').join('');
      return `<div class="hscroll"><svg class="heatmap" viewBox="0 0 ${W} ${Ht}" style="min-width:${Math.min(W, 520)}px" role="img" aria-label="Daily prayer heatmap, last ${weeks} weeks">${labels}${cells}</svg></div>
        <div class="hm-legend small muted"><span>Less</span>${[0, 1, 2, 3, 4].map((l) => `<svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="3" class="hm l${l}"/></svg>`).join('')}<span>More · relative to your daily target</span></div>`;
    },
    monthBars() {
      const totals = dayTotals(M.Storage.getSessions());
      const today = U.startOfDay(Date.now());
      const days = Array.from({ length: 30 }, (_, i) => { const ts = U.addDays(today, i - 29); return { ts, ms: totals.get(U.dayKey(ts)) || 0 }; });
      const max = Math.max(H, ...days.map((d) => d.ms));
      const W = 560, Ht = 120, bw = (W - 20) / 30;
      return `<svg class="chart" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Last 30 days">
        <line x1="10" x2="${W - 10}" y1="${Ht - 22}" y2="${Ht - 22}" class="c-axis"/>
        ${days.map((d, i) => { const h = d.ms / max * (Ht - 40); return `<rect x="${10 + i * bw + 1.5}" y="${Ht - 22 - h}" width="${bw - 3}" height="${h}" rx="2" class="c-bar ${i === 29 ? 'today' : ''}"><title>${U.fmtDate(d.ts)}: ${U.hm(d.ms)}</title></rect>`; }).join('')}
        <text x="10" y="${Ht - 6}" class="c-label">${U.fmtDate(days[0].ts, { month: 'short', day: 'numeric' })}</text>
        <text x="${W - 10}" y="${Ht - 6}" class="c-label" text-anchor="end">Today</text>
      </svg>`;
    },
    ring(pct, size = 220, stroke = 10, label = '') {
      const r = (size - stroke) / 2, c = 2 * Math.PI * r;
      return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${U.esc(label || Math.round(pct * 100) + '% complete')}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-fill" stroke-width="${stroke}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - U.clamp(pct, 0, 1))}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      </svg>`;
    },

    /* ---------------- view ---------------- */
    render(root) {
      const s = A.stats();
      const g = M.Goals.active();
      const p = M.Goals.progress(g);
      const proj = A.projection(g);
      const tgt = M.Goals.dailyTargetMs(g);
      const weekMs = (() => { const dow = (new Date().getDay() + 6) % 7; const mon = U.startOfDay(U.addDays(Date.now(), -dow)); return M.Storage.getSessions().filter((x) => x.start >= mon).reduce((a, x) => a + x.durationMs, 0); })();
      const firstTs = M.Storage.getSessions()[0];
      const spanDays = firstTs ? Math.round((U.startOfDay(Date.now()) - U.startOfDay(firstTs.start)) / U.DAY) + 1 : 0;
      const consistency = spanDays ? Math.round(s.activeDays / spanDays * 100) : 0;
      root.innerHTML = `
        <header class="view-head"><p class="eyebrow">Analytics</p><h1 class="view-title">The rhythm you are building.</h1></header>
        <section class="grid-2">
          <article class="panel">
            <div class="row between center"><h2 class="h3">This week</h2><span class="tnum muted">${U.hm(weekMs)}</span></div>
            ${A.weekBars(tgt)}
          </article>
          <article class="panel">
            <div class="row between center"><h2 class="h3">Cumulative — ${U.esc(g.name)}</h2><span class="tnum muted">${Math.floor(p.pct * 100)}%</span></div>
            ${A.cumulative(g)}
          </article>
        </section>
        <section class="stat-strip">
          ${tile('Average session', s.sessions ? U.hm(s.avgSessionMs) : '—')}
          ${tile('Sessions', s.sessions)}
          ${tile('Longest session', s.sessions ? U.hm(s.longestMs) : '—')}
          ${tile('Current streak', s.currentStreak + (s.currentStreak === 1 ? ' day' : ' days'))}
          ${tile('Best streak', s.bestStreak + (s.bestStreak === 1 ? ' day' : ' days'))}
          ${tile('Consistency', spanDays ? consistency + '%' : '—', spanDays ? s.activeDays + ' of ' + spanDays + ' days' : '')}
        </section>
        <section class="panel">${A.projectionHTML(proj, g)}</section>
        <section class="panel"><div class="row between center"><h2 class="h3">Last 30 days</h2></div>${A.monthBars()}</section>
        <section class="panel"><h2 class="h3">Daily heatmap</h2>${A.heatmap()}</section>`;
      function tile(k, v, sub) { return `<div class="stat"><p class="stat-k">${k}</p><p class="stat-v tnum">${v}</p>${sub ? `<p class="muted small">${sub}</p>` : ''}</div>`; }
    },
    projectionHTML(proj, g) {
      if (proj && proj.complete) return `<p class="eyebrow">Projected completion</p><p class="proj-date">Completed.</p><p class="muted">Now walk in what you have received.</p>`;
      if (!proj) return `<p class="eyebrow">Projected completion</p><p class="proj-empty">Keep sowing. Your completion date will appear as your rhythm becomes established.</p>`;
      const rem = M.Goals.isTimeBased(g) ? (() => { const t = Math.floor(proj.p.remainingMs / 60000); return `${Math.floor(t / 60)} <small>hours</small> ${t % 60} <small>minutes</small>`; })() : M.Goals.fmtRemaining(proj.p);
      return `<p class="eyebrow">Projected completion</p>
        <p class="muted">You are currently averaging <strong class="accent-text">${proj.perDayLabel}</strong>.</p>
        <p class="proj-date">${U.fmtDate(proj.date, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</p>
        <div class="proj-grid">
          <div><p class="stat-k">Time remaining</p><p class="stat-v tnum">${rem}</p></div>
          <div><p class="stat-k">Days remaining</p><p class="stat-v tnum">${proj.days}</p></div>
          <div><p class="stat-k">Weeks remaining</p><p class="stat-v tnum">${(Math.round(proj.weeks * 10) / 10).toFixed(1)}</p></div>
        </div>
        <p class="muted small">An estimate from your actual pace, recalculated after every session.</p>`;
    }
  };

  M.Analytics = A;
})(window.MDT = window.MDT || {});
