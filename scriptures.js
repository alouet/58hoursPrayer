/* ==========================================================================
   scriptures.js — Scripture engine, book principles & meditation mode
   ---------------------------------------------------------------------------
   Content types are kept distinct everywhere in the app:
     SCRIPTURE        — Bible text (translation noted; "as quoted in the book"
                        when the wording is taken from the manuscript)
     BOOK PRINCIPLE   — verbatim lines from "Money Doesn't Deserve My Time"
                        by Alouet Appolinaire Ndehem, with the journal entry date
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const THEMES = ['Wisdom', 'God’s Wisdom', 'Provision', 'Purpose', 'God’s Will', 'Focus', 'Perishable Things', 'Nations', 'Abundance & Flow', 'Direction', 'New Things', 'Freedom'];

  // v: translation. book:true => wording as quoted in the manuscript.
  const S = [
    { id: 'pro4-7', theme: 'Wisdom', ref: 'Proverbs 4:7', v: 'KJV', book: true, text: 'Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.' },
    { id: 'pro8-17', theme: 'Wisdom', ref: 'Proverbs 8:17', v: '', book: true, text: 'I love those who love me. Those who earnestly seek me find me.' },
    { id: 'pro8-10', theme: 'Wisdom', ref: 'Proverbs 8:10-11', v: 'KJV', book: true, text: 'Receive my instruction, and not silver; and knowledge rather than choice gold. For wisdom is better than rubies; and all the things that may be desired are not to be compared to it.' },
    { id: 'pro1-20', theme: 'Wisdom', ref: 'Proverbs 1:20-21', v: '', book: true, text: 'Wisdom cries outside; she utters her voice in the streets; she cries in the chief place of gathering, in the openings of the gates; in the city she utters her words.' },
    { id: 'pro3-13', theme: 'Wisdom', ref: 'Proverbs 3:13-14', v: 'KJV', book: false, text: 'Happy is the man that findeth wisdom, and the man that getteth understanding. For the merchandise of it is better than the merchandise of silver, and the gain thereof than fine gold.' },
    { id: '1co1-24', theme: 'God’s Wisdom', ref: '1 Corinthians 1:24', v: 'KJV', book: true, text: 'But unto them which are called, both Jews and Greeks, Christ the power of God, and the wisdom of God.' },
    { id: '1co1-25', theme: 'God’s Wisdom', ref: '1 Corinthians 1:25', v: 'KJV', book: true, text: 'Because the foolishness of God is wiser than men; and the weakness of God is stronger than men.' },
    { id: 'luk11-31', theme: 'God’s Wisdom', ref: 'Luke 11:31', v: '', book: true, text: 'The Queen of the South will rise at the judgment with this generation and condemn it; for she came from the ends of the earth to listen to Solomon’s wisdom, and now something greater than Solomon is here!' },
    { id: 'psa127-2', theme: 'Provision', ref: 'Psalm 127:2', v: '', book: true, text: 'It is useless to work so hard for a living, getting up early and going to bed late. For the LORD provides for those he loves, while they are asleep.' },
    { id: 'pro10-22', theme: 'Provision', ref: 'Proverbs 10:22', v: '', book: true, text: 'It is the LORD’s blessing that makes you wealthy. Hard work can make you no richer.' },
    { id: 'pro11-24', theme: 'Provision', ref: 'Proverbs 11:24', v: '', book: true, text: 'Some people spend their money freely and still grow richer. Others are cautious, and yet grow poorer.' },
    { id: 'isa55-1', theme: 'Provision', ref: 'Isaiah 55:1-3', v: 'KJV', book: true, text: 'Ho, every one that thirsteth, come ye to the waters, and he that hath no money; come ye, buy, and eat; yea, come, buy wine and milk without money and without price. Wherefore do ye spend money for that which is not bread? and your labour for that which satisfieth not? hearken diligently unto me, and eat ye that which is good, and let your soul delight itself in fatness. Incline your ear, and come unto me: hear, and your soul shall live.' },
    { id: 'joh4-34', theme: 'Purpose', ref: 'John 4:34', v: 'KJV', book: true, text: 'Jesus saith unto them, My meat is to do the will of him that sent me, and to finish his work.' },
    { id: 'joh9-4', theme: 'Purpose', ref: 'John 9:4', v: 'KJV', book: true, text: 'I must work the works of him that sent me, while it is day: the night cometh, when no man can work.' },
    { id: 'joh5-17', theme: 'Purpose', ref: 'John 5:17', v: 'CEV', book: true, text: 'But Jesus said, “My Father has never stopped working, and that is why I keep on working.”' },
    { id: 'joh6-38', theme: 'God’s Will', ref: 'John 6:38', v: 'KJV', book: true, text: 'For I came down from heaven, not to do mine own will, but the will of him that sent me.' },
    { id: 'heb10-7', theme: 'God’s Will', ref: 'Hebrews 10:7', v: 'MKJV', book: true, text: 'Then I said, Lo, I come (in the volume of the Book it is written of Me) to do Your will, O God.' },
    { id: 'php3-13', theme: 'Focus', ref: 'Philippians 3:13-14', v: 'KJV', book: true, text: 'This one thing I do, forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark for the prize of the high calling of God in Christ Jesus.' },
    { id: 'heb12-1', theme: 'Focus', ref: 'Hebrews 12:1-2', v: 'KJV', book: true, text: 'Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us, looking unto Jesus the author and finisher of our faith.' },
    { id: 'joh6-26', theme: 'Perishable Things', ref: 'John 6:26-27', v: '', book: true, text: 'Truly, truly, I tell you, it is not because you saw these signs that you are looking for Me, but because you ate the loaves and had your fill. Do not work for food that perishes, but for food that endures to eternal life, which the Son of Man will give you. For on Him God the Father has placed His seal of approval.' },
    { id: 'mat6-19', theme: 'Perishable Things', ref: 'Matthew 6:19-20', v: '', book: true, text: 'Do not store up for yourselves treasures on earth, where moth and rust destroy, and where thieves break in and steal. But store up for yourselves treasures in heaven, where moth and rust do not destroy, and where thieves do not break in and steal.' },
    { id: 'isa55-2', theme: 'Perishable Things', ref: 'Isaiah 55:2', v: '', book: true, text: 'Why spend money on that which is not bread, and your labor on that which does not satisfy? Listen carefully to Me, and eat what is good, and your soul will delight in the richest of foods.' },
    { id: 'pro23-4', theme: 'Perishable Things', ref: 'Proverbs 23:4-5', v: '', book: true, text: 'Do not wear yourself out to get rich; be wise enough to restrain yourself. When you glance at wealth, it disappears, for it makes wings for itself and flies like an eagle to the sky.' },
    { id: 'isa60-3', theme: 'Nations', ref: 'Isaiah 60:3-5', v: 'KJV', book: true, text: 'And the Gentiles shall come to thy light, and kings to the brightness of thy rising. Lift up thine eyes round about, and see: all they gather themselves together, they come to thee… Then thou shalt see, and flow together, and thine heart shall fear, and be enlarged; because the abundance of the sea shall be converted unto thee, the forces of the Gentiles shall come unto thee.' },
    { id: 'isa60-11', theme: 'Nations', ref: 'Isaiah 60:11', v: 'KJV', book: true, text: 'Therefore thy gates shall be open continually; they shall not be shut day nor night; that men may bring unto thee the forces of the Gentiles, and that their kings may be brought.' },
    { id: 'isa60-17', theme: 'Nations', ref: 'Isaiah 60:17', v: 'KJV', book: true, text: 'For brass I will bring gold, and for iron I will bring silver, and for wood brass, and for stones iron: I will also make thy officers peace, and thine exactors righteousness.' },
    { id: 'isa60-19', theme: 'Nations', ref: 'Isaiah 60:19', v: 'KJV', book: true, text: 'The sun shall be no more thy light by day; neither for brightness shall the moon give light unto thee: but the LORD shall be unto thee an everlasting light, and thy God thy glory.' },
    { id: 'isa45-14', theme: 'Nations', ref: 'Isaiah 45:14', v: 'ESV', book: true, text: 'Thus says the LORD: “The wealth of Egypt and the merchandise of Cush, and the Sabeans, men of stature, shall come over to you and be yours; they shall follow you… They will plead with you, saying: ‘Surely God is in you, and there is no other, no god besides him.’”' },
    { id: 'isa49-22', theme: 'Nations', ref: 'Isaiah 49:22', v: 'ESV', book: true, text: 'Thus says the Lord GOD: “Behold, I will lift up my hand to the nations, and raise my signal to the peoples; and they shall bring your sons in their arms, and your daughters shall be carried on their shoulders.”' },
    { id: 'isa49-23', theme: 'Nations', ref: 'Isaiah 49:23', v: 'ESV', book: true, text: 'Kings shall be your foster fathers, and their queens your nursing mothers… Then you will know that I am the LORD; those who wait for me shall not be put to shame.' },
    { id: 'isa66-12g', theme: 'Abundance & Flow', ref: 'Isaiah 66:12', v: 'GNT', book: true, text: 'The LORD says, “I will bring you lasting prosperity; the wealth of the nations will flow to you like a river that never goes dry. You will be like a child that is nursed by its mother, carried in her arms, and treated with love.”' },
    { id: 'isa66-12a', theme: 'Abundance & Flow', ref: 'Isaiah 66:12', v: 'AMP', book: true, text: 'For the LORD says this, “Behold, I extend peace to her (Jerusalem) like a river, and the glory of the nations like an overflowing stream; and you will be nursed, you will be carried on her hip and [playfully] rocked on her knees.”' },
    { id: 'isa66-12f', theme: 'Abundance & Flow', ref: 'Ésaïe 66:12', v: 'PDV2017', book: true, lang: 'fr', text: 'En effet, voici ce que le SEIGNEUR dit : « Je vais faire couler vers Jérusalem le bonheur comme un fleuve, et les richesses des peuples comme un torrent qui déborde. Je prendrai soin de vous comme une mère le fait pour le bébé qu’elle allaite. Elle le porte sur son dos et le caresse sur ses genoux. »' },
    { id: 'isa42-16', theme: 'Direction', ref: 'Isaiah 42:16', v: 'ESV', book: true, text: 'And I will lead the blind in a way that they do not know, in paths that they have not known I will guide them. I will turn the darkness before them into light, the rough places into level ground. These are the things I do, and I do not forsake them.' },
    { id: 'isa48-6', theme: 'New Things', ref: 'Isaiah 48:6-7', v: 'ESV', book: true, text: 'From this time forth I announce to you new things, hidden things that you have not known. They are created now, not long ago; before today you have never heard of them, lest you should say, ‘Behold, I knew them.’' },
    { id: 'isa14-3', theme: 'Freedom', ref: 'Isaiah 14:3', v: '', book: true, text: 'In the past, you were slaves. People forced you to work hard. But the LORD will take away the hard work you were forced to do.' }
  ];

  // Verbatim lines from the manuscript, with the entry they come from.
  const PRINCIPLES = [
    { id: 'bp1', date: 'Yaoundé · 14 Aug 2026, 05:57', text: 'CAN someone else do it? If yes then delegate it.' },
    { id: 'bp2', date: 'Yaoundé · 14 Aug 2026', text: 'That’s the new principle: outsourcing everything that would steal my precious time.' },
    { id: 'bp3', date: 'Yaoundé · 14 Aug 2026', text: 'I have recently understood the value of wisdom and spending time with God, these are the things I will spend my precious time on.' },
    { id: 'bp4', date: 'Yaoundé · 14 Aug 2026', text: 'I want to GET WISDOM, UNDERSTANDING, KNOWLEDGE, THE FEAR OF GOD.' },
    { id: 'bp5', date: '“Solomon was wrong” · 14 Aug 2026, 08:53', text: 'All this success can have a meaning when you send them to heaven. When you focus on working on what advances the kingdom of God.' },
    { id: 'bp6', date: 'Jolly Life bookshop · 28 Aug 2026', text: 'I want to work but ONLY ON THINGS HE ASKS ME TO FOCUS MY ENERGY ON. You know why? Because money doesn’t deserve my time.' },
    { id: 'bp7', date: 'Jolly Life bookshop · 28 Aug 2026', text: 'There is a race before me, and I am ready to give myself totally to it. Not to money. No, it doesn’t deserve my time.' },
    { id: 'bp8', date: 'Jolly Life bookshop · 28 Aug 2026', text: 'I press toward it!!! 1000 hours may just be a start…' },
    { id: 'bp9', date: '10 Sep 2026, 09:08', text: 'Your level of knowledge determines your experience.' },
    { id: 'bp10', date: 'Adullam by IANAH · 18 Sep 2026', text: 'I might have been chasing the BLESSINGS instead of the Blesser.' },
    { id: 'bp11', date: 'Adullam by IANAH · 18 Sep 2026', text: 'I DON’T WANT TO WASTE MY TIME on PERISHABLE THINGS.' },
    { id: 'bp12', date: 'Adullam by IANAH · 18 Sep 2026', text: 'THE ONLY THING THAT DESERVES MY TIME IS THE PURSUIT OF GOD’S WILL.' },
    { id: 'bp13', date: 'Adullam by IANAH · 18 Sep 2026', text: 'The goal is to KNOW MY PURPOSE, and give it all my energy and resources without EVER worrying about MONEY!' },
    { id: 'bp14', date: 'Adullam by IANAH · 18 Sep 2026', text: 'My Father who sent me has MADE PROVISION for the journey. He has already mapped everything out. I JUST HAVE TO WALK IN IT.' }
  ];

  const STEPS = [
    { k: 'read', t: 'Read', g: 'Read the verse slowly, twice. Once for the words, once for the voice behind them.' },
    { k: 'meditate', t: 'Meditate', g: 'Stay with one phrase. Turn it over. Let it speak into your time, your work, your provision.' },
    { k: 'declare', t: 'Declare', g: 'Speak it aloud in the first person. Make the Word your confession.' },
    { k: 'pray', t: 'Pray', g: 'Talk to God about what you just read. Ask for wisdom to walk in it today.' },
    { k: 'journal', t: 'Journal', g: 'Write what you received. An instruction, a revelation, a next step to obey.' }
  ];

  const Scripture = {
    ALL: S, THEMES, PRINCIPLES,
    byId(id) { return S.find((s) => s.id === id); },
    byRef(ref) { return S.find((s) => s.ref === ref); },
    random() { return U.pick(S.filter((s) => !s.lang)); },
    /** Stable "verse of the day" */
    today() { const pool = S.filter((s) => !s.lang); const d = new Date(); const n = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate(); return pool[n % pool.length]; },
    principleOfDay() { const d = new Date(); return PRINCIPLES[(d.getDate() + d.getMonth()) % PRINCIPLES.length]; },
    isFav(id) { return M.state.scripture.favorites.includes(id); },
    toggleFav(id) {
      const f = M.state.scripture.favorites; const i = f.indexOf(id);
      if (i >= 0) f.splice(i, 1); else f.push(id);
      M.Storage.touch('scripture');
    },
    cite(s) { return s.ref + (s.v ? ' ' + s.v : '') + (s.book ? '' : ''); },
    card(s, opts = {}) {
      return `<article class="verse-card ${opts.compact ? 'compact' : ''}" ${s.lang ? `lang="${s.lang}"` : ''}>
        <p class="kind">Scripture <span class="muted">· ${U.esc(s.theme)}</span></p>
        <blockquote class="verse">${U.esc(s.text)}</blockquote>
        <div class="row between center">
          <p class="scripture-ref">${U.esc(s.ref)}${s.v ? ' <span class="muted">' + U.esc(s.v) + '</span>' : ''}${s.book ? ' <span class="muted small">· as quoted in the book</span>' : ''}</p>
          ${opts.actions === false ? '' : `<div class="row gap-s">
            <button class="icon-btn ${Scripture.isFav(s.id) ? 'on' : ''}" data-vfav="${s.id}" aria-pressed="${Scripture.isFav(s.id)}" aria-label="Favorite ${U.esc(s.ref)}">${U.icon('heart')}</button>
            <button class="btn sm ghost" data-meditate="${s.id}">Meditate</button></div>`}
        </div></article>`;
    },
    principleCard(p) {
      return `<article class="principle-card"><p class="kind">Book principle <span class="muted">· ${U.esc(p.date)}</span></p><p class="principle">${U.esc(p.text)}</p><p class="muted small">Money Doesn’t Deserve My Time — Alouet Appolinaire Ndehem</p></article>`;
    },

    render(root) {
      const filter = Scripture._filter || 'All';
      const favs = M.state.scripture.favorites;
      const list = filter === 'All' ? S : filter === 'Favorites' ? S.filter((s) => favs.includes(s.id)) : S.filter((s) => s.theme === filter);
      const today = Scripture.today();
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Scripture for the journey</p>
          <h1 class="view-title">Let every verse turn your attention back to God.</h1>
        </header>
        <section class="today-verse">${Scripture.card(today)}</section>
        <div class="chip-row" role="tablist" aria-label="Scripture themes">
          ${['All', 'Favorites'].concat(THEMES).map((t) => `<button class="chip ${t === filter ? 'on' : ''}" role="tab" aria-selected="${t === filter}" data-sfilter="${U.esc(t)}">${U.esc(t)}</button>`).join('')}
        </div>
        <section class="verse-grid">${list.length ? list.map((s) => Scripture.card(s)).join('') : '<div class="empty"><p class="empty-title">No favorites yet.</p><p class="muted">Tap the heart on any verse to keep it here.</p></div>'}</section>
        <section>
          <header class="section-head"><p class="eyebrow">From the manuscript</p><h2 class="h2">Book principles</h2><p class="muted">Lines from <em>Money Doesn’t Deserve My Time</em>, dated as they were written.</p></header>
          <div class="principle-grid">${PRINCIPLES.map(Scripture.principleCard).join('')}</div>
        </section>`;
      U.$$('[data-sfilter]', root).forEach((b) => b.onclick = () => { Scripture._filter = b.dataset.sfilter; Scripture.render(root); });
    },

    /** Global handlers for fav / meditate buttons anywhere in the app */
    bind() {
      U.on(document.body, 'click', '[data-vfav]', (e, b) => {
        Scripture.toggleFav(b.dataset.vfav);
        const on = Scripture.isFav(b.dataset.vfav);
        U.$$('[data-vfav="' + b.dataset.vfav + '"]').forEach((x) => { x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
        U.toast(on ? 'Added to favorites.' : 'Removed from favorites.');
      });
      U.on(document.body, 'click', '[data-meditate]', (e, b) => Scripture.meditate(b.dataset.meditate));
    },

    /** Scripture meditation mode: Read → Meditate → Declare → Pray → Journal */
    meditate(id, step = 0) {
      const s = Scripture.byId(id); if (!s) return;
      const m = U.modal(`
        <div class="meditation" ${s.lang ? `lang="${s.lang}"` : ''}>
          <p class="kind">Scripture meditation</p>
          <blockquote class="verse xl">${U.esc(s.text)}</blockquote>
          <p class="scripture-ref">${U.esc(s.ref)} ${s.v ? '<span class="muted">' + U.esc(s.v) + '</span>' : ''}</p>
          <ol class="stepper" role="tablist">${STEPS.map((st, i) => `<li><button role="tab" class="step ${i === step ? 'on' : ''}" data-step="${i}" aria-selected="${i === step}">${st.t}</button></li>`).join('')}</ol>
          <div class="step-body" id="step-body"></div>
        </div>`, { wide: true, label: 'Meditate on ' + s.ref });
      const body = U.$('#step-body', m);
      const show = (i) => {
        U.$$('.step', m).forEach((b, j) => { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j); });
        const st = STEPS[i];
        let extra = '';
        if (st.k === 'meditate') {
          extra = `<p class="label">Meditate for</p><div class="chip-row">${[5, 10, 15, 30].map((n) => `<button class="chip" data-med-min="${n}">${n} min</button>`).join('')}
            <span class="custom-min"><input id="med-custom" type="number" min="1" max="600" placeholder="Custom" aria-label="Custom minutes"><button class="chip" data-med-min="custom">Start</button></span></div>
            <p class="muted small">The timer counts toward your journey and gently chimes when the time is complete.</p>`;
        } else if (st.k === 'declare') {
          extra = `<p class="muted small">Speak the verse aloud. Then declare:</p><p class="declaration-line">“${U.esc(declFor(s))}”</p><p class="kind">Personal declaration</p>`;
        } else if (st.k === 'journal') {
          extra = `<label class="field"><span>What did you receive from ${U.esc(s.ref)}?</span><textarea id="med-note" rows="4" placeholder="Write your thoughts, instructions, revelations or prayers…"></textarea></label><div class="row end"><button class="btn primary" data-med-save>Save to journal</button></div>`;
        }
        body.innerHTML = `<p class="step-guide">${st.g}</p>${extra}
          <div class="row between"><button class="btn ghost sm" data-step-go="${i - 1}" ${i === 0 ? 'disabled' : ''}>${U.icon('left')} Back</button>${i < STEPS.length - 1 ? `<button class="btn ghost sm" data-step-go="${i + 1}">Next ${U.icon('right')}</button>` : ''}</div>`;
      };
      show(step);
      U.on(m, 'click', '[data-step]', (e, b) => show(+b.dataset.step));
      U.on(m, 'click', '[data-step-go]', (e, b) => show(+b.dataset.stepGo));
      U.on(m, 'click', '[data-med-min]', (e, b) => {
        let n = b.dataset.medMin === 'custom' ? +U.$('#med-custom', m).value : +b.dataset.medMin;
        if (!n || n < 1) return U.toast('Enter the number of minutes.', 'warn');
        if (M.Timer.isActive) return U.toast('A session is already running — end it first.', 'warn');
        U.closeModal();
        M.Prayer.start({ mode: 'meditate', verseRef: s.id, title: 'Meditation — ' + s.ref, plannedMs: n * 60000 });
      });
      U.on(m, 'click', '[data-med-save]', () => {
        const txt = U.$('#med-note', m).value.trim();
        if (!txt) return U.toast('Write something first.', 'warn');
        M.Storage.saveJournalEntry({ id: U.uid('jr'), createdAt: Date.now(), category: 'WHAT GOD IS TEACHING ME', title: s.ref, text: txt, tags: ['Scripture'], favorite: false, verseRef: s.id });
        U.toast('Saved to your journal.'); U.closeModal();
      });
    }
  };

  /** Theme → matching personal declaration for the Declare step */
  const THEME_DECL = { 'Wisdom': 'd10', 'God\u2019s Wisdom': 'd02', 'Provision': 'd05', 'Purpose': 'd03', 'God\u2019s Will': 'd02', 'Focus': 'd04', 'Perishable Things': 'd01', 'Nations': 'd07', 'Abundance & Flow': 'd09', 'Direction': 'd07', 'New Things': 'd07', 'Freedom': 'd08' };
  function declFor(s) { const d = M.Declarations.byId(THEME_DECL[s.theme] || 'd06'); return d ? d.text : 'My time belongs to God.'; }

  M.Scripture = Scripture;
})(window.MDT = window.MDT || {});
