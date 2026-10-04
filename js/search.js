/* FRESHMART — Part 06: smart search + live suggestions.
   Ranked, typo-tolerant, synonym-aware product search; header autosuggest (keyboard + screen-reader friendly);
   recent & popular searches; "did you mean" for empty results. Exposes window.FM_SEARCH. */
(function () {
  const root = () => document.body.dataset.root || '';
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s) => norm(s).split(' ').filter(Boolean);
  const rupee = (n) => '₹' + n.toLocaleString('en-IN');
  const RECENT_KEY = 'fm_recent', MAX_RECENT = 5;

  /* Everyday Indian-grocery synonyms (each group is interchangeable). */
  const GROUPS = [['dahi', 'curd', 'yogurt', 'yoghurt'], ['atta', 'flour', 'wheat'], ['chai', 'tea'], ['jeera', 'cumin'], ['doodh', 'milk'],
    ['aloo', 'potato', 'potatoes'], ['palak', 'spinach'], ['pyaz', 'onion'], ['tamatar', 'tomato'], ['chawal', 'rice'], ['murgi', 'chicken'],
    ['biscuit', 'biscuits', 'cookie', 'cookies'], ['soda', 'cola', 'soft drink'], ['shahad', 'honey'], ['makhan', 'butter'], ['anda', 'egg', 'eggs'],
    ['nimbu', 'lemon'], ['namak', 'salt'], ['cheeni', 'sugar'], ['tel', 'oil'], ['nappy', 'diaper', 'diapers']];
  const SYN = {};
  GROUPS.forEach((g) => g.forEach((w) => (SYN[w] = g.filter((x) => x !== w))));

  const lev = (a, b) => {
    if (Math.abs(a.length - b.length) > 2) return 3;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  const maxEdit = (w) => (w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0);

  /* Pre-index once: lower-cased words per product + a vocabulary for spelling suggestions. */
  const catName = (id) => (FM.categories.find((c) => c.id === id) || {});
  const idx = FM.products.map((p) => {
    const c = catName(p.category);
    return { p, name: norm(p.name), nameW: words(p.name), brand: norm(p.brand), brandW: words(p.brand), cat: norm(`${c.name} ${(c.sub || []).join(' ')}`), catW: words(`${c.name} ${(c.sub || []).join(' ')}`), desc: words(p.description) };
  });
  const vocab = [...new Set(idx.flatMap((i) => [...i.nameW, ...i.brandW]).filter((w) => w.length >= 3 && !/^\d/.test(w)))];

  function tokenScore(it, t) {
    let best = 0;
    const up = (n) => { if (n > best) best = n; };
    for (const v of [t, ...(SYN[t] || [])]) {
      const f = v === t ? 1 : 0.9;
      if (it.nameW.includes(v)) up(100 * f);
      else if (it.nameW.some((w) => w.startsWith(v))) up(80 * f);
      else if (it.name.includes(v)) up(55 * f);
      if (it.brandW.some((w) => w === v || w.startsWith(v))) up(70 * f);
      else if (it.brand.includes(v)) up(45 * f);
      if (it.catW.some((w) => w === v || (v.length > 2 && w.startsWith(v)))) up(35 * f);
      if (it.desc.some((w) => w.startsWith(v))) up(15 * f); else if (v.length > 3 && it.desc.some((w) => w.includes(v))) up(10 * f);
    }
    if (!best && t.length >= 4) {                       // typo tolerance
      const m = maxEdit(t);
      if (it.nameW.some((w) => lev(t, w) <= m)) up(35);
      else if (it.brandW.some((w) => lev(t, w) <= m)) up(18);
    }
    return best;
  }
  function search(q) {
    const toks = words(q);
    if (!toks.length) return FM.products.slice();
    return idx.map((it) => {
      let sum = 0;
      for (const t of toks) { const s = tokenScore(it, t); if (!s) return null; sum += s; }
      if (it.name.startsWith(toks.join(' '))) sum += 40;       // whole-phrase prefix bonus
      return { p: it.p, s: sum + it.p.rating * 2 + Math.min(it.p.reviews, 3000) / 300 };
    }).filter(Boolean).sort((a, b) => b.s - a.s).map((r) => r.p);
  }
  /* Closest real word for each token that has no match — powers “Did you mean…?” */
  function correct(q) {
    const toks = words(q); let changed = false;
    const out = toks.map((t) => {
      if (vocab.includes(t) || vocab.some((w) => w.startsWith(t)) || SYN[t]) return t;
      let best = null, bd = 99;
      vocab.forEach((w) => { const d = lev(t, w); if (d < bd) { bd = d; best = w; } });
      if (best && bd <= Math.max(1, Math.ceil(t.length / 3))) { changed = true; return best; }
      return t;
    });
    return changed ? out.join(' ') : '';
  }
  const hi = (text, q) => {
    const ts = words(q).filter((t) => t.length > 0).sort((a, b) => b.length - a.length);
    let out = esc(text);
    ts.forEach((t) => { out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?![^<]*>)', 'ig'), '<mark>$1</mark>'); });
    return out;
  };

  /* ---------- recent + popular ---------- */
  const recent = { get() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } },
    add(q) { q = q.trim(); if (q.length < 2) return; try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...this.get().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT))); } catch {} },
    clear() { try { localStorage.removeItem(RECENT_KEY); } catch {} } };
  const popular = ['Milk', 'Paneer', 'Basmati rice', 'Bananas', 'Atta', 'Tea', 'Honey', 'Eggs', 'Chips'].filter((x) => search(x).length);

  /* ---------- suggestions model ---------- */
  function suggest(q) {
    const toks = words(q), res = search(q), products = res.slice(0, 5);
    const last = toks[toks.length - 1] || '';
    const cats = FM.categories.filter((c) => { const nw = words(c.name + ' ' + c.sub.join(' ')), hit = (t) => nw.some((w) => w.startsWith(t)); return toks.length && toks.every((t) => t.length > 2 && (hit(t) || (SYN[t] || []).some(hit))); }).slice(0, 2);
    const brands = [...new Set(FM.products.map((p) => p.brand))].filter((b) => toks.length && norm(b).split(' ').some((w) => w.startsWith(last)) && toks.length === 1).slice(0, 2);
    return { products, cats, brands, total: res.length, correction: res.length ? '' : correct(q) };
  }

  /* ---------- dropdown UI ---------- */
  let form, input, box, items = [], active = -1, open = false;
  const shopUrl = (qs) => `${root()}pages/shop.html?${qs}`;
  const productUrl = (p) => `${root()}pages/product.html?id=${p.id}`;
  const ico = (n, c = 'w-4 h-4') => `<i data-lucide="${n}" class="${c}" aria-hidden="true"></i>`;
  const row = (href, inner, extra = '') => `<a class="sg-row" role="option" id="sg-${items.length}" href="${href}" ${extra}>${inner}</a>`;

  function thumb(p) {
    const tint = catName(p.category).tint || '#EEF6E4';
    return `<span class="sg-thumb" style="--tint:${tint}"><img src="${root()}${p.image}" alt="" onerror="this.remove()"><span aria-hidden="true">${p.emoji}</span></span>`;
  }
  function html(q) {
    items = []; const add = (h) => { const r = h; items.push(1); return r; };
    const val = q.trim();
    if (!val) {
      const rec = recent.get();
      let h = '';
      if (rec.length) h += `<div class="sg-head"><span>Recent searches</span><button type="button" class="sg-clear" data-sg="clear-recent">Clear</button></div>` +
        rec.map((r) => add(row(shopUrl('q=' + encodeURIComponent(r)), `${ico('history')}<span class="sg-text">${esc(r)}</span>`, `data-q="${esc(r)}"`))).join('');
      h += `<div class="sg-head"><span>Popular searches</span></div><div class="sg-chips">` +
        popular.map((r) => add(row(shopUrl('q=' + encodeURIComponent(r)), `${ico('trending-up', 'w-3.5 h-3.5')}${esc(r)}`, `data-q="${esc(r)}" class="sg-chip sg-row"`).replace('class="sg-row" role', 'role'))).join('') + `</div>`;
      return h;
    }
    const s = suggest(val); let h = '';
    if (s.products.length) {
      h += `<div class="sg-head"><span>Products</span></div>` + s.products.map((p) => add(row(productUrl(p),
        `${thumb(p)}<span class="sg-main"><span class="sg-name">${hi(p.name, val)}</span><small>${esc(p.brand)} · ${esc(p.weight)}</small></span><span class="sg-price">${rupee(p.price)}</span>`))).join('');
    }
    if (s.cats.length || s.brands.length) {
      h += `<div class="sg-head"><span>Browse</span></div>` +
        s.cats.map((c) => add(row(shopUrl('cat=' + c.id), `${ico(c.icon)}<span class="sg-text">in <b>${esc(c.name)}</b></span>`))).join('') +
        s.brands.map((b) => add(row(shopUrl('brand=' + encodeURIComponent(b)), `${ico('tag')}<span class="sg-text">Brand: <b>${hi(b, val)}</b></span>`))).join('');
    }
    if (!s.products.length) {
      h += `<div class="sg-empty">${ico('search-x', 'w-5 h-5')}<p>No matches for “${esc(val)}”.</p>` +
        (s.correction ? `` : `<small>Try a simpler word, like “milk” or “rice”.</small>`) + `</div>`;
      if (s.correction) h += add(row(shopUrl('q=' + encodeURIComponent(s.correction)), `${ico('lightbulb')}<span class="sg-text">Did you mean <b>${esc(s.correction)}</b>?</span>`, `data-q="${esc(s.correction)}"`));
    }
    h += add(row(shopUrl('q=' + encodeURIComponent(val)), `${ico('search')}<span class="sg-text">${s.total ? `See all ${s.total} result${s.total === 1 ? '' : 's'} for` : 'Search for'} “<b>${esc(val)}</b>”</span>`, `data-q="${esc(val)}" data-all="1"`));
    return h;
  }
  function render() {
    box.innerHTML = html(input.value);
    active = -1; input.removeAttribute('aria-activedescendant');
    window.lucide && lucide.createIcons();
  }
  function show() { if (open) return; open = true; box.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function hide() { open = false; box.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function move(d) {
    const els = box.querySelectorAll('.sg-row'); if (!els.length) return;
    active = (active + d + els.length) % els.length;
    els.forEach((e, i) => { e.classList.toggle('is-active', i === active); e.setAttribute('aria-selected', String(i === active)); });
    input.setAttribute('aria-activedescendant', els[active].id); els[active].scrollIntoView({ block: 'nearest' });
  }
  function go(q) { recent.add(q); hide(); form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); }

  function init() {
    form = document.getElementById('search-form'); input = document.getElementById('search-input'); if (!form || !input) return;
    box = document.createElement('div'); box.id = 'search-suggest'; box.className = 'sg-panel'; box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Search suggestions'); box.hidden = true;
    form.appendChild(box);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-controls', 'search-suggest'); input.setAttribute('aria-expanded', 'false');
    input.addEventListener('focus', () => { render(); show(); });
    input.addEventListener('input', () => { render(); show(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); show(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); show(); move(-1); }
      else if (e.key === 'Escape') { if (open) { e.preventDefault(); hide(); } }
      else if (e.key === 'Enter' && open && active > -1) { e.preventDefault(); const el = box.querySelectorAll('.sg-row')[active]; el.click(); }
    });
    box.addEventListener('mousedown', (e) => e.preventDefault());            // keep focus in the input
    box.addEventListener('click', (e) => {
      if (e.target.closest('[data-sg="clear-recent"]')) { recent.clear(); render(); return; }
      const a = e.target.closest('a.sg-row'); if (!a) return;
      const q = a.dataset.q;
      if (q) { e.preventDefault(); input.value = q; go(q); } else { recent.add(input.value); hide(); }   // product / category / brand links navigate normally
    });
    document.addEventListener('click', (e) => { if (!form.contains(e.target)) hide(); });
    document.addEventListener('keydown', (e) => {                          // "/" focuses search
      if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }
  window.FM_SEARCH = { init, search, suggest, correct, popular, recent, norm };
})();
