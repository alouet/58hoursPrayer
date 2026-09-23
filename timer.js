/* ==========================================================================
   timer.js — background-safe prayer timer
   ---------------------------------------------------------------------------
   The timer NEVER counts ticks. It stores timestamps and derives elapsed time:

       elapsed = accumulatedMs + (running ? Date.now() - segmentStart : 0) + creditMs

   • Pause  : accumulatedMs += now - segmentStart; segmentStart = null
   • Resume : segmentStart = now
   • Every state change is persisted synchronously (localStorage) + IndexedDB,
     so a reload, tab kill or phone sleep restores the exact session.
   • On visibilitychange / pageshow / focus / resume the display is recomputed
     and the screen wake lock (if the user asked for it) is re-acquired.
   • Session ids are created at start and reused on save => no duplicates even
     if "End" is pressed twice or the page dies mid-save.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  let active = null;           // persisted active-session object
  let loop = null;
  let wakeLock = null;
  const subs = [];

  function now() { return Date.now(); }
  function persist() { M.Storage.saveActive(active); }
  function emit(type) { subs.forEach((fn) => { try { fn(type, Timer); } catch (e) { console.warn(e); } }); }

  function computeElapsed(a) {
    if (!a) return 0;
    let run = 0;
    if (a.segmentStart) run = Math.max(0, now() - a.segmentStart); // clamp if device clock moved back
    return Math.max(0, (a.accumulatedMs || 0) + run + (a.creditMs || 0));
  }

  function startLoop() {
    stopLoop();
    loop = setInterval(() => {
      emit('tick');
      if (active && active.plannedMs && !active.plannedDone && computeElapsed(active) >= active.plannedMs) {
        active.plannedDone = true; persist(); emit('planned');
      }
    }, 500);
  }
  function stopLoop() { if (loop) clearInterval(loop); loop = null; }

  /* ---------- Screen Wake Lock (best effort, never promised) ---------- */
  async function acquireWake() {
    if (!active || !active.keepAwake || active.paused) return false;
    if (!('wakeLock' in navigator)) { Timer.wakeSupported = false; return false; }
    try {
      if (wakeLock) return true;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; emit('wake'); });
      emit('wake');
      return true;
    } catch (e) { wakeLock = null; emit('wake'); return false; }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }

  /* ---------- lifecycle recovery ---------- */
  function recover() {
    if (!active) return;
    emit('tick');
    if (document.visibilityState === 'visible') acquireWake();
  }
  ['visibilitychange', 'pageshow', 'focus', 'resume'].forEach((ev) => {
    (ev === 'visibilitychange' || ev === 'resume' ? document : window).addEventListener(ev, recover);
  });
  window.addEventListener('pagehide', () => { if (active) persist(); });

  const Timer = {
    wakeSupported: 'wakeLock' in navigator,
    subscribe(fn) { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
    get active() { return active; },
    get isActive() { return !!active; },
    get isPaused() { return !!(active && active.paused); },
    get wakeOn() { return !!wakeLock; },
    elapsed() { return computeElapsed(active); },

    /** Restore a session that was running when the page was closed/killed. */
    async restore() {
      const a = await M.Storage.loadActive();
      if (!a || !a.id || !Number.isFinite(a.startedAt)) { M.Storage.saveActive(null); return null; }
      // if it had already been saved (page died after save), don't duplicate
      if (a.ending && M.state.sessions.some((s) => s.id === a.id)) { M.Storage.saveActive(null); return null; }
      a.ending = false;
      active = a;
      startLoop();
      emit('restore');
      acquireWake();
      return a;
    },

    start(opts = {}) {
      if (active) return active;
      const t = now();
      const goal = M.Goals.active();
      active = {
        id: U.uid('ses'), goalId: opts.goalId || (goal && goal.id), mode: opts.mode || 'pray',
        title: opts.title || '', verseRef: opts.verseRef || '', plannedMs: opts.plannedMs || 0, plannedDone: false,
        startedAt: t, segmentStart: t, accumulatedMs: 0, creditMs: 0, paused: false,
        keepAwake: opts.keepAwake != null ? opts.keepAwake : !!M.state.settings.keepAwake, ending: false
      };
      persist(); startLoop(); acquireWake(); emit('start');
      return active;
    },
    pause() {
      if (!active || active.paused) return;
      active.accumulatedMs += Math.max(0, now() - active.segmentStart);
      active.segmentStart = null; active.paused = true;
      persist(); releaseWake(); emit('pause');
    },
    resume() {
      if (!active || !active.paused) return;
      active.segmentStart = now(); active.paused = false;
      persist(); acquireWake(); emit('resume');
    },
    toggle() { if (!active) return; active.paused ? Timer.resume() : Timer.pause(); },
    /** Credit extra minutes (time already spent with God away from the timer) */
    addTime(ms) {
      if (!active) return 0;
      if (ms < 0) ms = Math.max(ms, -computeElapsed(active)); // never below 00:00:00
      active.creditMs = (active.creditMs || 0) + ms; persist(); emit('tick');
      return ms;
    },
    setKeepAwake(on) {
      if (!active) return;
      active.keepAwake = on; persist();
      if (on) return acquireWake();
      releaseWake(); emit('wake'); return Promise.resolve(false);
    },
    setMode(mode) { if (active) { active.mode = mode; persist(); emit('tick'); } },

    /** Stop the timer and save the session. Returns the saved session, or null. */
    end(extra = {}) {
      if (!active || active.ending) return null;
      const elapsed = computeElapsed(active);
      active.ending = true;
      if (!active.paused) { active.accumulatedMs += Math.max(0, now() - active.segmentStart); active.segmentStart = null; active.paused = true; }
      persist();
      const endTs = now();
      const session = {
        id: active.id, goalId: active.goalId, mode: active.mode, title: extra.title || active.title || M.Prayer.modeLabel(active.mode),
        start: active.startedAt, end: endTs, durationMs: Math.round(elapsed), verseRef: active.verseRef,
        notes: '', tags: [], sown: [], source: 'timer', createdAt: endTs
      };
      let saved = null;
      if (session.durationMs >= 1000) saved = M.Storage.saveSession(session);
      M.Storage.flush();
      active = null; stopLoop(); releaseWake();
      M.Storage.saveActive(null);
      emit('end');
      return saved;
    },
    /** Throw away the running session (with confirmation handled by caller) */
    discard() { active = null; stopLoop(); releaseWake(); M.Storage.saveActive(null); emit('end'); }
  };

  M.Timer = Timer;
})(window.MDT = window.MDT || {});
