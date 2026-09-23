/* ==========================================================================
   pwa.js — service worker registration, install prompt, update notice
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;
  let deferred = null;

  const PWA = {
    canInstall() { return !!deferred; },
    async install() {
      if (!deferred) return U.toast('Use your browser menu → Install / Add to Home Screen.');
      deferred.prompt();
      try { await deferred.userChoice; } catch (e) { /* ignore */ }
      deferred = null;
    },
    init() {
      window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
      window.addEventListener('appinstalled', () => { deferred = null; U.toast('Installed. You can open it from your home screen.'); });
      // Service workers only exist on http(s) origins that allow them; the app works without one.
      if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || document.documentElement.dataset.bundle === 'single') return;
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').then((reg) => {
          reg.addEventListener('updatefound', () => {
            const w = reg.installing; if (!w) return;
            w.addEventListener('statechange', () => {
              if (w.state === 'installed' && navigator.serviceWorker.controller) U.toast('A new version is ready. It will load next time you open the app.');
            });
          });
        }).catch(() => { /* offline support unavailable in this context — app still works */ });
      });
    }
  };

  M.PWA = PWA;
})(window.MDT = window.MDT || {});
