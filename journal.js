/* ==========================================================================
   journal.js — Journal, Testimonies, and the REAL provision log
   (real, user-entered records — always kept apart from faith visualizations)
   ========================================================================== */
(function (M) {
  'use strict';
  const U = M.U;

  const CATS = ['WHAT GOD IS TEACHING ME', 'WHAT I AM HEARING', 'WHAT I AM LEARNING', 'WHAT I NEED TO OBEY', 'IDEAS', 'BUSINESS INSIGHTS', 'PRAYER REQUESTS', 'GRATITUDE', 'TESTIMONIES', 'PROVISION'];
  const T_CATS = ['Provision', 'Opportunity', 'Client', 'Business', 'Idea', 'Partnership', 'Unexpected help', 'Debt reduction', 'Gift', 'Sale', 'Investment', 'Other'];
  const title = (c) => c.charAt(0) + c.slice(1).toLowerCase();

  const J = {
    CATS, T_CATS,
    state: { cat: 'All', q: '', fav: false },

    render(root) {
      const st = J.state;
      let list = M.Storage.getJournal();
      if (st.cat !== 'All') list = list.filter((e) => e.category === st.cat);
      if (st.fav) list = list.filter((e) => e.favorite);
      if (st.q) { const q = st.q.toLowerCase(); list = list.filter((e) => (e.title + ' ' + e.text + ' ' + (e.tags || []).join(' ')).toLowerCase().includes(q)); }
      const total = M.Storage.getJournal().length;
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Journal</p>
          <h1 class="view-title">Write what you are learning.</h1>
          <div class="row gap wrap">
            <button class="btn primary" data-j-new>${U.icon('plus')} New entry</button>
            <button class="btn ghost" data-j-export ${total ? '' : 'disabled'}>${U.icon('download')} Export</button>
          </div>
        </header>
        <div class="toolbar">
          <label class="search"><span class="sr-only">Search journal</span>${U.icon('search')}<input id="j-q" type="search" placeholder="Search entries, tags…" value="${U.esc(st.q)}"></label>
          <button class="chip ${st.fav ? 'on' : ''}" data-j-fav aria-pressed="${st.fav}">${U.icon('heart')} Favorites</button>
        </div>
        <div class="chip-row scroll-x" role="tablist" aria-label="Journal categories">${['All'].concat(CATS).map((c) => `<button class="chip sm ${st.cat === c ? 'on' : ''}" role="tab" aria-selected="${st.cat === c}" data-j-cat="${U.esc(c)}">${U.esc(c === 'All' ? 'All' : title(c))}</button>`).join('')}</div>
        <section class="entries">${list.length ? list.map(J.entryCard).join('') : `<div class="empty"><div class="empty-ico">${U.icon('journal')}</div><p class="empty-title">${total ? 'Nothing matches.' : 'Write what you are learning.'}</p><p class="muted">${total ? 'Try another word or category.' : 'Instructions, revelations, prayers, ideas — keep them here.'}</p></div>`}</section>`;

      U.$('[data-j-new]', root).onclick = () => J.editor();
      U.$('[data-j-export]', root).onclick = () => J.exportMd();
      U.$('[data-j-fav]', root).onclick = () => { st.fav = !st.fav; J.render(root); };
      U.$$('[data-j-cat]', root).forEach((b) => b.onclick = () => { st.cat = b.dataset.jCat; J.render(root); });
      const q = U.$('#j-q', root);
      q.oninput = () => { st.q = q.value; clearTimeout(J._t); J._t = setTimeout(() => { J.render(root); const n = U.$('#j-q', root); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
      U.on(root, 'click', '[data-j-act]', async (e, b) => {
        const en = M.Storage.getJournal().find((x) => x.id === b.dataset.id); if (!en) return;
        if (b.dataset.jAct === 'fav') { en.favorite = !en.favorite; M.Storage.saveJournalEntry(en); J.render(root); }
        if (b.dataset.jAct === 'edit') J.editor(en);
        if (b.dataset.jAct === 'del') { if (await U.confirm('Delete this entry?', 'This journal entry will be removed.', { ok: 'Delete', danger: true })) { M.Storage.remove('journal', en.id); J.render(root); } }
      });
    },
    entryCard(e) {
      return `<article class="entry">
        <div class="row between center wrap gap-s"><p class="kind">${U.esc(title(e.category || 'Journal'))}</p><p class="muted small tnum">${U.fmtDate(e.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} · ${U.fmtTime(e.createdAt)}</p></div>
        ${e.title ? `<h3 class="entry-title">${U.esc(e.title)}</h3>` : ''}
        <p class="entry-text">${U.esc(e.text)}</p>
        <div class="row between center wrap gap-s">
          <p class="tl-tags">${(e.tags || []).map((t) => `<span class="tag">${U.esc(t)}</span>`).join('')}</p>
          <div class="row gap-s">
            <button class="icon-btn sm ${e.favorite ? 'on' : ''}" data-j-act="fav" data-id="${e.id}" aria-pressed="${!!e.favorite}" aria-label="Favorite">${U.icon('heart')}</button>
            <button class="icon-btn sm" data-j-act="edit" data-id="${e.id}" aria-label="Edit">${U.icon('edit')}</button>
            <button class="icon-btn sm" data-j-act="del" data-id="${e.id}" aria-label="Delete">${U.icon('trash')}</button>
          </div></div></article>`;
    },
    editor(e) {
      const isNew = !e;
      e = e || { id: U.uid('jr'), createdAt: Date.now(), category: J.state.cat !== 'All' ? J.state.cat : CATS[0], title: '', text: '', tags: [], favorite: false };
      const m = U.modal(`<h3 class="modal-title">${isNew ? 'New entry' : 'Edit entry'}</h3>
        <form class="form" id="j-form">
          <label class="field"><span>Category</span><select id="j-cat">${CATS.map((c) => `<option ${c === e.category ? 'selected' : ''} value="${c}">${title(c)}</option>`).join('')}</select></label>
          <label class="field"><span>Title (optional)</span><input id="j-title" value="${U.esc(e.title)}"></label>
          <label class="field"><span>Entry</span><textarea id="j-text" rows="7" required placeholder="What is God teaching you?">${U.esc(e.text)}</textarea></label>
          <p class="label">Tags</p>
          <div class="chip-row">${M.Prayer.TAGS.map((t) => `<button type="button" class="chip sm ${(e.tags || []).includes(t) ? 'on' : ''}" aria-pressed="${(e.tags || []).includes(t)}" data-jt="${t}">${t}</button>`).join('')}</div>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${isNew ? 'Save entry' : 'Save changes'}</button></div>
        </form>`, { label: 'Journal entry' });
      U.on(m, 'click', '[data-jt]', (ev, b) => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      U.$('#j-form', m).onsubmit = (ev) => {
        ev.preventDefault();
        const text = U.$('#j-text', m).value.trim(); if (!text) return;
        Object.assign(e, { category: U.$('#j-cat', m).value, title: U.$('#j-title', m).value.trim(), text, tags: U.$$('[data-jt].on', m).map((b) => b.dataset.jt) });
        M.Storage.saveJournalEntry(e); U.closeModal(); U.toast('Saved to your journal.'); M.App.refresh();
      };
    },
    exportMd() {
      const md = ['# Journal — Money Doesn’t Deserve My Time', ''].concat(M.Storage.getJournal().map((e) =>
        `## ${e.title || title(e.category)}\n_${new Date(e.createdAt).toLocaleString()} · ${title(e.category)}${(e.tags || []).length ? ' · ' + e.tags.join(', ') : ''}_\n\n${e.text}\n`)).join('\n');
      if (!U.download('journal-' + U.dayKey(Date.now()) + '.md', md, 'text/markdown')) U.copy(md).then((ok) => U.toast(ok ? 'Journal copied to clipboard.' : 'Export unavailable here.'));
      else U.toast('Journal exported.');
    },

    /* ---------------- Testimonies ---------------- */
    renderTestimonies(root) {
      const list = M.Storage.live('testimonies').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      root.innerHTML = `
        <header class="view-head">
          <p class="eyebrow">Testimonies</p>
          <h1 class="view-title">Remember what God has done.</h1>
          <p class="lede">Real events you record yourself. They are kept separate from every faith visualization.</p>
          <div class="row gap"><button class="btn primary" data-t-new>${U.icon('plus')} Record a testimony</button></div>
        </header>
        <section class="entries">${list.length ? list.map((t) => `<article class="entry testimony">
          <div class="row between center wrap gap-s"><p class="kind"><span class="pill real">Real · recorded by you</span> ${U.esc(t.category)}</p><p class="muted small tnum">${t.date ? U.fmtDate(U.fromInputs(t.date), { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p></div>
          <p class="entry-text">${U.esc(t.what)}</p>
          ${t.amount ? `<p class="t-amount tnum">${U.esc(t.amount)} ${U.esc(t.currency || '')}${t.source ? ' <span class="muted small">from ' + U.esc(t.source) + '</span>' : ''}</p>` : t.source ? `<p class="muted small">Source: ${U.esc(t.source)}</p>` : ''}
          ${t.learned ? `<p class="small"><span class="label">What I learned</span> ${U.esc(t.learned)}</p>` : ''}
          ${t.scripture ? `<p class="scripture-ref small">${U.esc(t.scripture)}</p>` : ''}
          <div class="row end gap-s"><button class="icon-btn sm" data-t-edit="${t.id}" aria-label="Edit">${U.icon('edit')}</button><button class="icon-btn sm" data-t-del="${t.id}" aria-label="Delete">${U.icon('trash')}</button></div>
        </article>`).join('') : `<div class="empty"><div class="empty-ico">${U.icon('gift')}</div><p class="empty-title">Your testimony journal is empty.</p><p class="muted">When God moves, write it down here — provision, direction, help, doors opened.</p></div>`}</section>`;
      U.$('[data-t-new]', root).onclick = () => J.testimonyEditor();
      U.on(root, 'click', '[data-t-edit]', (e, b) => J.testimonyEditor(M.Storage.live('testimonies').find((x) => x.id === b.dataset.tEdit)));
      U.on(root, 'click', '[data-t-del]', async (e, b) => { if (await U.confirm('Delete this testimony?', 'It will be removed from your records.', { ok: 'Delete', danger: true })) { M.Storage.remove('testimonies', b.dataset.tDel); M.App.refresh(); } });
    },
    testimonyEditor(t) {
      const isNew = !t;
      t = t || { id: U.uid('ts'), date: U.dayKey(Date.now()), what: '', amount: '', currency: 'FCFA', source: '', category: 'Provision', learned: '', scripture: '' };
      const m = U.modal(`<h3 class="modal-title">${isNew ? 'Record a testimony' : 'Edit testimony'}</h3>
        <form class="form" id="t-form">
          <div class="grid2"><label class="field"><span>Date</span><input type="date" id="t-date" value="${U.esc(t.date)}"></label>
          <label class="field"><span>Category</span><select id="t-cat">${T_CATS.map((c) => `<option ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
          <label class="field"><span>What happened</span><textarea id="t-what" rows="4" required>${U.esc(t.what)}</textarea></label>
          <div class="grid2"><label class="field"><span>Amount (if relevant)</span><input id="t-amount" inputmode="decimal" value="${U.esc(t.amount)}"></label>
          <label class="field"><span>Currency</span><input id="t-cur" value="${U.esc(t.currency)}"></label></div>
          <label class="field"><span>Source</span><input id="t-src" value="${U.esc(t.source)}"></label>
          <label class="field"><span>What I believe I learned</span><textarea id="t-learned" rows="2">${U.esc(t.learned)}</textarea></label>
          <label class="field"><span>Associated Scripture</span><input id="t-scr" value="${U.esc(t.scripture)}" placeholder="e.g. Psalm 127:2"></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div>
        </form>`, { label: 'Testimony' });
      U.$('#t-form', m).onsubmit = (e) => {
        e.preventDefault();
        Object.assign(t, { date: U.$('#t-date', m).value, category: U.$('#t-cat', m).value, what: U.$('#t-what', m).value.trim(), amount: U.$('#t-amount', m).value.trim(), currency: U.$('#t-cur', m).value.trim(), source: U.$('#t-src', m).value.trim(), learned: U.$('#t-learned', m).value.trim(), scripture: U.$('#t-scr', m).value.trim() });
        M.Storage.upsert('testimonies', t); U.closeModal(); U.toast('Testimony recorded.'); M.App.refresh();
      };
    },

    /* ---------------- Real provision log (shown in The Flow) ---------------- */
    provisionHTML() {
      const list = M.Storage.live('provisions').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const totals = {};
      list.forEach((p) => { const n = parseFloat(String(p.amount).replace(/[^\d.-]/g, '')); if (!isNaN(n)) totals[p.currency || ''] = (totals[p.currency || ''] || 0) + n; });
      return `<div class="real-log">
        <div class="row between center wrap gap">
          <div><p class="kind"><span class="pill real">Real provision · logged by you</span></p><h2 class="h2">Actual events</h2><p class="muted small">Only what you enter. Nothing here is simulated.</p></div>
          <button class="btn primary sm" data-prov-new>${U.icon('plus')} Log real provision</button>
        </div>
        ${list.length ? `<p class="small muted tnum">${list.length} ${list.length === 1 ? 'entry' : 'entries'}${Object.keys(totals).length ? ' · recorded total: ' + Object.entries(totals).map(([c, v]) => v.toLocaleString() + ' ' + U.esc(c)).join(', ') : ''}</p>
        <div class="table-wrap"><table class="real-table"><thead><tr><th>Date</th><th>Source</th><th>Description</th><th class="num">Amount</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
        ${list.map((p) => `<tr><td class="tnum">${p.date ? U.fmtDate(U.fromInputs(p.date), { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</td><td>${U.esc(p.source)}</td><td>${U.esc(p.description)}</td><td class="num tnum">${U.esc(p.amount)} ${U.esc(p.currency)}</td><td><button class="icon-btn sm" data-prov-del="${p.id}" aria-label="Delete entry">${U.icon('trash')}</button></td></tr>`).join('')}
        </tbody></table></div>` : `<div class="empty small"><p class="muted">No real provision logged yet. When something actually happens, record it here.</p></div>`}
      </div>`;
    },
    bindProvision(root) {
      const b = U.$('[data-prov-new]', root); if (b) b.onclick = () => J.provisionEditor();
      U.on(root, 'click', '[data-prov-del]', async (e, x) => { if (await U.confirm('Delete this entry?', 'This real provision record will be removed.', { ok: 'Delete', danger: true })) { M.Storage.remove('provisions', x.dataset.provDel); M.App.refresh(); } });
    },
    provisionEditor() {
      const m = U.modal(`<h3 class="modal-title">Real provision</h3><p class="muted small">Record an actual event. It is displayed separately from the faith visualization.</p>
        <form class="form" id="pv-form">
          <div class="grid2"><label class="field"><span>Amount</span><input id="pv-amount" inputmode="decimal" required></label><label class="field"><span>Currency</span><input id="pv-cur" value="FCFA"></label></div>
          <label class="field"><span>Source</span><input id="pv-src" required placeholder="Client, sale, gift…"></label>
          <label class="field"><span>Date</span><input id="pv-date" type="date" value="${U.dayKey(Date.now())}"></label>
          <label class="field"><span>Description</span><textarea id="pv-desc" rows="2"></textarea></label>
          <div class="row end gap"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save entry</button></div>
        </form>`, { label: 'Real provision' });
      U.$('#pv-form', m).onsubmit = (e) => {
        e.preventDefault();
        M.Storage.upsert('provisions', { id: U.uid('pv'), amount: U.$('#pv-amount', m).value.trim(), currency: U.$('#pv-cur', m).value.trim(), source: U.$('#pv-src', m).value.trim(), date: U.$('#pv-date', m).value, description: U.$('#pv-desc', m).value.trim(), createdAt: Date.now() });
        U.closeModal(); U.toast('Real provision recorded.'); M.App.refresh();
      };
    }
  };

  M.Journal = J;
})(window.MDT = window.MDT || {});
