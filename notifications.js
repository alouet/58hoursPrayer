/* ==========================================================================
   notifications.js — gentle, optional reminders
   ---------------------------------------------------------------------------
   Web apps cannot schedule notifications while fully closed without a push
   server. So reminders fire while the app is open or running in the
   background, and a calendar file (.ics) is offered for reminders that
   arrive even when the app is closed. Messages are never guilt-inducing.
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  const GENTLE = ['Your prayer time is waiting.', 'Plant today’s seed.', 'Stay faithful to the journey.', 'Give God your attention.', 'Stay in His presence.'];
  let loop = null;

  const N = {
    supported: 'Notification' in window,
    permission() { return N.supported ? Notification.permission : 'unsupported'; },
    async request() {
      if (!N.supported) { U.toast('This browser does not support notifications. In-app reminders will still appear.'); return 'unsupported'; }
      try {
        const r = await Notification.requestPermission();
        if (r === 'denied') U.toast('Notifications are blocked. You can allow them in your browser settings. In-app reminders still work.', 'warn');
        return r;
      } catch (e) { return 'denied'; }
    },
    message() {
      const g = M.Goals.active();
      const left = M.Goals.dailyTargetMs(g) - M.Analytics.todayMs();
      if (left > 60000 && Math.random() < 0.5) return 'You have ' + U.hm(left) + ' remaining today.';
      return U.pick(GENTLE);
    },
    async show(body) {
      const title = 'Money Doesn’t Deserve My Time';
      if (N.permission() === 'granted') {
        try {
          const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
          if (reg) { await reg.showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'mdt-reminder' }); return; }
          new Notification(title, { body }); return;
        } catch (e) { /* fall through to in-app */ }
      }
      U.toast(body);
    },
    tick() {
      const r = M.state.settings.reminders;
      if (!r || !r.enabled || M.Timer.isActive) return;
      const now = new Date();
      if (r.days && !r.days.includes(now.getDay())) return;
      const hm = U.pad(now.getHours()) + ':' + U.pad(now.getMinutes());
      const key = 'mdt.rem.' + U.dayKey(Date.now()) + '.' + hm;
      if (!(r.times || []).includes(hm)) return;
      try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { if (N._last === key) return; N._last = key; }
      N.show(N.message());
    },
    init() { clearInterval(loop); loop = setInterval(N.tick, 20000); },
    /** Calendar file with daily recurring reminders */
    ics() {
      const r = M.state.settings.reminders;
      const d = new Date(); const ymd = d.getFullYear() + U.pad(d.getMonth() + 1) + U.pad(d.getDate());
      const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const byday = (r.days || [0, 1, 2, 3, 4, 5, 6]).map((i) => days[i]).join(',');
      const ev = (r.times || []).map((t, i) => [
        'BEGIN:VEVENT', 'UID:mdt-' + i + '-' + ymd + '@prayer', 'DTSTAMP:' + ymd + 'T000000', 'DTSTART:' + ymd + 'T' + t.replace(':', '') + '00',
        'DURATION:PT30M', 'RRULE:FREQ=WEEKLY;BYDAY=' + byday, 'SUMMARY:Plant today’s seed — prayer time', 'DESCRIPTION:Your prayer time is waiting.',
        'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:Your prayer time is waiting.', 'END:VALARM', 'END:VEVENT'].join('\r\n'));
      const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MDT//Prayer Journey//EN'].concat(ev).concat(['END:VCALENDAR']).join('\r\n');
      if (!U.download('prayer-reminders.ics', txt, 'text/calendar')) U.toast('Downloads are not available here.');
    }
  };

  M.Notifications = N;
})(window.MDT = window.MDT || {});
