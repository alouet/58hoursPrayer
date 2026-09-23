/* ==========================================================================
   declarations.js — Declaration engine (DECLARE) + philosophy & encouragement
   ---------------------------------------------------------------------------
   PERSONAL DECLARATIONS are first-person confessions inspired by the book;
   they are not quotations from it (book quotes live in scriptures.js).
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const BASE = [
    { id: 'd01', text: 'I refuse to make money the master of my time.' },
    { id: 'd02', text: 'My greatest pursuit is God, wisdom, understanding and His will.' },
    { id: 'd03', text: 'I give my energy to the things God has called me to do.' },
    { id: 'd04', text: 'I refuse to sacrifice my purpose merely to chase money.' },
    { id: 'd05', text: 'I trust God for provision as I walk in obedience.' },
    { id: 'd06', text: 'My time belongs to God.' },
    { id: 'd07', text: 'I am learning to recognize the opportunities, systems and ideas God places before me.' },
    { id: 'd08', text: 'I have time to pray, learn, create, serve and love.' },
    { id: 'd09', text: 'I pursue the Blesser, not merely the blessing.' },
    { id: 'd10', text: 'I seek wisdom above silver and knowledge above gold.' }
  ];

  const PHILOSOPHY = [
    'I don’t want more money at the expense of my life.',
    'I want more life because money is no longer my master.',
    'My time is for God.',
    'My energy is for purpose.',
    'My resources are for impact.',
    'My work is to do what God has given me to do.',
    'I seek the Blesser, not only the blessing.'
  ];

  const ENCOURAGE = [
    'Keep sowing. You don’t need to see the harvest today.', 'One more hour.', 'Stay in His presence.', 'Your time is precious.',
    'Wisdom is worth pursuing.', 'Do not abandon the journey because you cannot yet see the outcome.', 'You are building a rhythm.',
    'Seek first what matters most.', 'The goal is not merely money. The goal is alignment with God.', 'Keep listening.', 'Keep learning.',
    'Keep obeying.', 'Keep walking.', 'You don’t have to figure everything out today.', 'Give God your attention.', 'Your purpose deserves your energy.'
  ];

  const D = {
    PHILOSOPHY, ENCOURAGE,
    all() { return BASE.concat((M.state.declarations.custom || []).filter((c) => !c.deleted)); },
    byId(id) { return D.all().find((d) => d.id === id); },
    number(d) { const i = D.all().indexOf(d); return U.pad(i + 1); },
    random() { return U.pick(D.all()); },
    today() { const all = D.all(); const d = new Date(); return all[(d.getDate() * 7 + d.getMonth()) % all.length]; },
    encouragement() { return U.pick(ENCOURAGE); },
    isFav(id) { return M.state.declarations.favorites.includes(id); },
    doneToday() { return M.state.declarations.done[U.dayKey(Date.now())] || {}; },
    markDone(id) {
      const k = U.dayKey(Date.now());
      const map = M.state.declarations.done[k] = M.state.declarations.done[k] || {};
      map[id] = (map[id] || 0) + 1;
      M.Storage.touch('declarations');
      return map[id];
    },
    toggleFav(id) {
      const f = M.state.declarations.favorites; const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1); else f.push(id);
      M.Storage.touch('declarations');
    },
    card(d, { reveal = true } = {}) {
      return `<article class="decl-card"><p class="kind">Personal declaration <span class="muted">· ${D.number(d)}</span></p><p class="declaration-line">“${U.esc(d.text)}”</p></article>`;
    },

    render(root) {
      const st = M.state.declarations;
      const deck = D._deck || (D._deck = D.all().map((d) => d.id));
      let idx = U.clamp(D._idx || 0, 0, deck.length - 1);
      const done = D.doneToday();
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Declare</p>
          <h1 class="view-title">Speak what you believe until you live it.</h1>
          <p class="lede">Personal declarations inspired by the book. Tap the card to reveal, swipe to move through them.</p>
        </header>
        <section class="deck-wrap">
          <div class="deck" id="deck" tabindex="0" aria-live="polite" aria-label="Declaration card. Use left and right arrow keys to move."></div>
          <div class="deck-controls">
            <button class="icon-btn lg" data-deck="prev" aria-label="Previous declaration">${U.icon('left')}</button>
            <button class="icon-btn lg" data-deck="shuffle" aria-label="Shuffle">${U.icon('shuffle')}</button>
            <button class="icon-btn lg" data-deck="fav" aria-label="Favorite">${U.icon('heart')}</button>
            <button class="icon-btn lg" data-deck="repeat" aria-label="Declare again">${U.icon('repeat')}</button>
            <button class="icon-btn lg" data-deck="done" aria-label="Mark as declared today">${U.icon('check')}</button>
            <button class="icon-btn lg" data-deck="next" aria-label="Next declaration">${U.icon('right')}</button>
          </div>
          <p class="muted small center" id="deck-status"></p>
        </section>
        <section class="panel">
          <div class="row between center wrap gap"><h2 class="h3">All declarations</h2><span class="muted small tnum">${Object.keys(done).length} of ${deck.length} declared today</span></div>
          <ol class="decl-list">${D.all().map((d) => `<li class="${done[d.id] ? 'done' : ''}"><span class="num tnum">${D.number(d)}</span><span class="t">${U.esc(d.text)}</span>${done[d.id] ? `<span class="pill">${U.icon('check')} ×${done[d.id]}</span>` : ''}${D.isFav(d.id) ? `<span class="fav-dot" aria-label="Favorite">${U.icon('heart')}</span>` : ''}${d.custom ? `<button class="icon-btn sm" data-decl-del="${d.id}" aria-label="Delete declaration">${U.icon('trash')}</button>` : ''}</li>`).join('')}</ol>
          <form class="row gap add-decl" id="add-decl"><label class="sr-only" for="new-decl">New declaration</label><input id="new-decl" placeholder="Write your own declaration…"><button class="btn primary sm">${U.icon('plus')} Add</button></form>
        </section>
        <section class="panel soft">
          <p class="eyebrow">The philosophy</p>
          <ul class="philosophy">${PHILOSOPHY.map((p) => `<li>${U.esc(p)}</li>`).join('')}</ul>
        </section>`;

      const deckEl = U.$('#deck', root);
      let revealed = false;
      const draw = () => {
        const d = D.byId(deck[idx]) || D.all()[0];
        deckEl.innerHTML = `<div class="decl-face ${revealed ? 'revealed' : ''}">
          <p class="kind">Declaration ${D.number(d)}</p>
          <p class="declaration-line big">“${U.esc(d.text)}”</p>
          <p class="tap-hint">${revealed ? '' : 'Tap to reveal'}</p></div>`;
        const favBtn = U.$('[data-deck="fav"]', root);
        favBtn.classList.toggle('on', D.isFav(d.id)); favBtn.setAttribute('aria-pressed', D.isFav(d.id));
        const n = D.doneToday()[d.id];
        U.$('#deck-status', root).textContent = (idx + 1) + ' / ' + deck.length + (n ? ' · declared ' + n + '× today' : '');
        D._idx = idx;
      };
      const go = (dir) => { idx = (idx + dir + deck.length) % deck.length; revealed = false; draw(); };
      deckEl.onclick = () => { revealed = true; draw(); };
      deckEl.onkeydown = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); revealed = true; draw(); } };
      // swipe
      let sx = null;
      deckEl.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      deckEl.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); sx = null; });
      U.$$('[data-deck]', root).forEach((b) => b.onclick = () => {
        const a = b.dataset.deck; const id = deck[idx];
        if (a === 'prev') go(-1);
        if (a === 'next') go(1);
        if (a === 'shuffle') { D._deck = U.shuffle(D.all().map((d) => d.id)); D._idx = 0; D.render(root); U.toast('Shuffled.'); }
        if (a === 'fav') { D.toggleFav(id); draw(); }
        if (a === 'repeat' || a === 'done') { revealed = true; const n = D.markDone(id); if (a === 'done') { U.toast('Declared. ×' + n + ' today'); go(1); D.render(root); } else { U.toast('Declare it again. ×' + n); draw(); } }
      });
      U.$('#add-decl', root).onsubmit = (e) => {
        e.preventDefault(); const v = U.$('#new-decl', root).value.trim(); if (!v) return;
        st.custom.push({ id: U.uid('dc'), text: v, custom: true, createdAt: Date.now() });
        M.Storage.touch('declarations'); D._deck = null; D._idx = D.all().length - 1; D.render(root); U.toast('Declaration added.');
      };
      U.on(root, 'click', '[data-decl-del]', (e, b) => {
        const c = st.custom.find((x) => x.id === b.dataset.declDel); if (c) c.deleted = true;
        M.Storage.touch('declarations'); D._deck = null; D._idx = 0; D.render(root);
      });
      draw();
    }
  };

  M.Declarations = D;
})(window.MDT = window.MDT || {});
