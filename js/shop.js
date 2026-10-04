/* FRESHMART — shop page: filters, sorting, view toggle, pagination, URL sync. Loaded on pages/shop.html only. */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PER = 12;
  const SORTS = {
    relevance: ['Relevance', null],
    'price-asc': ['Price: Low to High', (a, b) => a.price - b.price],
    'price-desc': ['Price: High to Low', (a, b) => b.price - a.price],
    rating: ['Top Rated', (a, b) => b.rating - a.rating || b.reviews - a.reviews],
    discount: ['Biggest Discount', (a, b) => b.discount - a.discount || b.reviews - a.reviews],
    popular: ['Most Popular', (a, b) => b.reviews - a.reviews],
    name: ['Name: A to Z', (a, b) => a.name.localeCompare(b.name)]
  };
  const MAXP = Math.ceil(Math.max(...FM.products.map((p) => p.price)) / 100) * 100;
  const defaults = () => ({ q: '', category: [], brand: [], min: 0, max: MAXP, rating: 0, discount: 0, sort: 'relevance', view: 'grid', page: 1 });
  let s = defaults(), showAllBrands = false;

  const brandCounts = (() => { const m = {}; FM.products.forEach((p) => (m[p.brand] = (m[p.brand] || 0) + 1)); return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); })();

  function query(st = s) {
    const q = st.q.trim();
    const base = q && window.FM_SEARCH ? FM_SEARCH.search(q) : FM.products.slice();   // ranked by relevance when searching
    const list = base.filter((p) =>
      (!st.category.length || st.category.includes(p.category)) && (!st.brand.length || st.brand.includes(p.brand)) &&
      p.price >= st.min && p.price <= st.max && p.rating >= st.rating && p.discount >= st.discount);
    const fn = SORTS[st.sort] && SORTS[st.sort][1];
    return fn ? list.sort(fn) : list;
  }

  /* ---------- URL <-> state ---------- */
  function readUrl() {
    const u = new URLSearchParams(location.search), num = (k, d) => (isFinite(parseFloat(u.get(k))) ? parseFloat(u.get(k)) : d);
    s = defaults();
    s.q = u.get('q') || '';
    s.category = (u.get('cat') || '').split(',').filter((c) => FM.categories.some((x) => x.id === c));
    s.brand = (u.get('brand') || '').split('|').filter((b) => brandCounts.some((x) => x[0] === b));
    s.min = Math.max(0, num('min', 0)); s.max = Math.min(MAXP, num('max', MAXP)); s.rating = num('rating', 0); s.discount = num('discount', 0);
    s.sort = SORTS[u.get('sort')] ? u.get('sort') : 'relevance'; s.view = u.get('view') === 'list' ? 'list' : 'grid'; s.page = Math.max(1, num('page', 1) | 0);
  }
  function writeUrl() {
    const u = new URLSearchParams(), d = defaults();
    if (s.q) u.set('q', s.q);
    if (s.category.length) u.set('cat', s.category.join(','));
    if (s.brand.length) u.set('brand', s.brand.join('|'));
    ['min', 'max', 'rating', 'discount'].forEach((k) => s[k] !== d[k] && u.set(k, s[k]));
    ['sort', 'view'].forEach((k) => s[k] !== d[k] && u.set(k, s[k]));
    if (s.page > 1) u.set('page', s.page);
    history.replaceState(null, '', u.toString() ? '?' + u : location.pathname);
  }

  /* ---------- render ---------- */
  const row = (type, name, value, label, count, on) => `<label class="f-row"><input type="${type}" name="${name}" value="${esc(value)}" ${on ? 'checked' : ''}><span>${esc(label)}</span>${count != null ? `<small>${count}</small>` : ''}</label>`;
  function filtersHtml(total) {
    const cats = FM.categories.map((c) => row('checkbox', 'cat', c.id, c.name, FM.db.getProductsByCategory(c.id).length, s.category.includes(c.id))).join('');
    const brands = brandCounts.filter(([b], i) => i < 8 || showAllBrands || s.brand.includes(b)).map(([b, n]) => row('checkbox', 'brand', b, b, n, s.brand.includes(b))).join('');
    const presets = [['Under ₹100', 0, 100], ['₹100 – ₹300', 100, 300], ['₹300 – ₹600', 300, 600], ['Over ₹600', 600, MAXP]]
      .map(([l, a, b]) => `<button type="button" class="chip-sm ${s.min === a && s.max === b ? 'on' : ''}" data-sf="price" data-min="${a}" data-max="${b}">${l}</button>`).join('');
    const radios = (name, opts, cur) => opts.map(([v, l]) => row('radio', name, v, l, null, cur === v)).join('');
    return `<div class="f-head"><h3>Filters</h3><button type="button" class="f-clear" data-sf="clear">Clear all</button><button type="button" class="f-close" data-sf="close" aria-label="Close filters"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <details class="f-group" open><summary>Categories</summary>${cats}</details>
    <details class="f-group" open><summary>Price (₹)</summary><div class="price-inputs"><input id="p-min" type="number" min="0" max="${MAXP}" value="${s.min}" aria-label="Minimum price"><span>to</span><input id="p-max" type="number" min="0" max="${MAXP}" value="${s.max}" aria-label="Maximum price"></div><div class="presets">${presets}</div></details>
    <details class="f-group" open><summary>Brand</summary>${brands}<button type="button" class="f-more" data-sf="brands">${showAllBrands ? 'Show fewer' : `Show all ${brandCounts.length} brands`}</button></details>
    <details class="f-group"><summary>Customer rating</summary>${radios('rating', [[0, 'Any rating'], [4.5, '4.5★ & above'], [4, '4★ & above']], s.rating)}</details>
    <details class="f-group"><summary>Discount</summary>${radios('discount', [[0, 'Any discount'], [10, '10% or more'], [15, '15% or more'], [20, '20% or more']], s.discount)}</details>
    <button type="button" class="btn btn-primary f-apply" data-sf="close">Show ${total} result${total === 1 ? '' : 's'}</button>`;
  }
  const chip = (label, k, v = '') => `<button type="button" class="active-chip" data-sf="rm" data-k="${k}" data-v="${esc(v)}">${esc(label)}<i data-lucide="x" class="w-3 h-3"></i></button>`;
  function pagerHtml(pages) {
    if (pages < 2) return '';
    const nums = [...new Set([1, s.page - 1, s.page, s.page + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    let out = `<button data-sf="page" data-n="${s.page - 1}" ${s.page === 1 ? 'disabled' : ''} aria-label="Previous page"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>`, prev = 0;
    nums.forEach((n) => { if (n - prev > 1) out += '<span class="gap">…</span>'; out += `<button data-sf="page" data-n="${n}" class="${n === s.page ? 'on' : ''}" ${n === s.page ? 'aria-current="page"' : ''}>${n}</button>`; prev = n; });
    return out + `<button data-sf="page" data-n="${s.page + 1}" ${s.page === pages ? 'disabled' : ''} aria-label="Next page"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>`;
  }
  function emptyHtml() {
    const fix = s.q && window.FM_SEARCH ? FM_SEARCH.correct(s.q) : '';
    const pop = window.FM_SEARCH ? FM_SEARCH.popular.slice(0, 6).map((x) => `<button type="button" class="chip-sm" data-sf="q" data-q="${esc(x)}">${esc(x)}</button>`).join('') : '';
    return `<div class="empty"><strong>${s.q ? `No results for “${esc(s.q)}”` : 'No products match your filters'}</strong>
      ${fix ? `<p class="mt-2">Did you mean <button type="button" class="did-you-mean" data-sf="q" data-q="${esc(fix)}">${esc(fix)}</button>?</p>` : ''}
      <p class="text-muted text-sm mt-2">Check the spelling, try a more general word, or clear your filters.</p>
      ${pop ? `<div class="presets mt-4" style="justify-content:center">${pop}</div>` : ''}
      <button type="button" class="btn btn-primary btn-sm mt-4" data-sf="clear">Clear all filters</button></div>`;
  }
  function render() {
    const list = query(), pages = Math.max(1, Math.ceil(list.length / PER));
    s.page = Math.min(s.page, pages);
    const slice = list.slice((s.page - 1) * PER, s.page * PER);
    const one = s.category.length === 1 ? FM.db.getCategoryById(s.category[0]) : null;
    $('#shop-heading').innerHTML = FM_UI.SectionHeading({ eyebrow: 'Shop', title: esc(s.q ? `Results for “${s.q}”` : one ? one.name : 'All Products'), subtitle: one ? esc(one.description) : '' });
    $('#product-grid').className = 'product-grid' + (s.view === 'list' ? ' is-list' : '');
    $('#product-grid').innerHTML = slice.length ? FM_APP.cards(slice) : emptyHtml();
    $('#grid-status').textContent = list.length ? `Showing ${(s.page - 1) * PER + 1}–${(s.page - 1) * PER + slice.length} of ${list.length} products` : '0 products';
    const d = defaults(), chips = [];
    if (s.q) chips.push(chip(`“${s.q}”`, 'q'));
    s.category.forEach((c) => chips.push(chip(FM.db.getCategoryById(c).name, 'cat', c)));
    s.brand.forEach((b) => chips.push(chip(b, 'brand', b)));
    if (s.min !== d.min || s.max !== d.max) chips.push(chip(`₹${s.min} – ₹${s.max}`, 'price'));
    if (s.rating) chips.push(chip(`${s.rating}★ & up`, 'rating'));
    if (s.discount) chips.push(chip(`${s.discount}%+ off`, 'discount'));
    $('#active-chips').innerHTML = chips.join('') + (chips.length > 1 ? '<button type="button" class="f-clear" data-sf="clear">Clear all</button>' : '');
    $('#filters').innerHTML = filtersHtml(list.length);
    $('#pager').innerHTML = pagerHtml(pages);
    $('#sort').value = s.sort;
    document.querySelectorAll('.view-toggle button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.view));
    $('#search-input').value = s.q;
    writeUrl(); window.lucide && lucide.createIcons();
  }
  const set = (patch) => { Object.assign(s, patch, { page: 1 }); render(); };
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const drawer = (open) => { $('#filters').classList.toggle('open', open); $('#f-overlay').classList.toggle('show', open); document.body.classList.toggle('no-scroll', open); };

  function init() {
    $('#sort').innerHTML = Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}">${l}</option>`).join('');
    readUrl(); render();
    $('#sort').addEventListener('change', (e) => set({ sort: e.target.value }));
    $('#filters').addEventListener('change', (e) => {
      const t = e.target;
      if (t.name === 'cat') set({ category: toggleIn(s.category, t.value) });
      else if (t.name === 'brand') set({ brand: toggleIn(s.brand, t.value) });
      else if (t.name === 'rating') set({ rating: +t.value });
      else if (t.name === 'discount') set({ discount: +t.value });
      else if (t.id === 'p-min' || t.id === 'p-max') {
        let a = Math.max(0, +$('#p-min').value || 0), b = Math.min(MAXP, +$('#p-max').value || MAXP);
        if (a > b) [a, b] = [b, a]; set({ min: a, max: b });
      }
    });
    document.addEventListener('keydown', (e) => e.key === 'Escape' && drawer(false));
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-sf]'); if (!el) return;
      const d = el.dataset, a = d.sf;
      if (a === 'clear') set({ ...defaults(), sort: s.sort, view: s.view });
      else if (a === 'q') set({ q: d.q, category: [] });
      else if (a === 'price') set({ min: +d.min, max: +d.max });
      else if (a === 'brands') { showAllBrands = !showAllBrands; render(); }
      else if (a === 'view') { s.view = d.v; render(); }
      else if (a === 'open') drawer(true);
      else if (a === 'close') drawer(false);
      else if (a === 'page') { s.page = +d.n; render(); $('#shop-heading').scrollIntoView({ behavior: 'smooth' }); }
      else if (a === 'rm') {
        const k = d.k;
        set(k === 'q' ? { q: '' } : k === 'cat' ? { category: s.category.filter((x) => x !== d.v) } : k === 'brand' ? { brand: s.brand.filter((x) => x !== d.v) } : k === 'price' ? { min: 0, max: MAXP } : { [k]: 0 });
      }
    });
  }
  window.FM_SHOP = { init, set, query: (patch) => query({ ...defaults(), ...patch }) };
})();
