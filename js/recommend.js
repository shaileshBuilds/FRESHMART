/* FRESHMART — Part 11: recommendations (window.FM_REC).
   Rule-based and fully local: uses recently viewed (fm_viewed), cart, wishlist and past orders (fm_orders) on this device.
   Surfaces: home (Buy it again, Recently viewed, Recommended for you), product page (Frequently bought together, Recently viewed),
   cart ("Complete your basket") and the account overview. */
(function () {
  const U = window.FM_UI || {}, { SectionHeading, Toast, rupee } = U;
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const root = () => document.body.dataset.root || '';
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = (id) => FM.products.find((p) => p.id === +id);
  const inCart = (id) => !!(window.FM_CART && FM_CART.qty(id));
  /* which categories go well together */
  const PAIRS = {
    'fruits-vegetables': ['dairy-bakery', 'spices', 'breakfast'], 'dairy-bakery': ['breakfast', 'fruits-vegetables', 'beverages'],
    'rice-pulses': ['spices', 'atta-flour', 'dairy-bakery'], 'atta-flour': ['dairy-bakery', 'spices', 'rice-pulses'],
    spices: ['rice-pulses', 'fruits-vegetables', 'meat-seafood'], snacks: ['beverages', 'frozen'], beverages: ['snacks', 'breakfast'],
    breakfast: ['dairy-bakery', 'beverages', 'fruits-vegetables'], 'personal-care': ['household', 'baby-care'], household: ['personal-care'],
    'baby-care': ['personal-care', 'household'], 'pet-care': ['household'], 'meat-seafood': ['spices', 'fruits-vegetables', 'rice-pulses'],
    organic: ['breakfast', 'fruits-vegetables', 'rice-pulses'], frozen: ['snacks', 'beverages', 'dairy-bakery']
  };
  const quality = (p) => p.rating / 5 + Math.min(p.discount, 25) / 100;
  /* best-scoring products, with at most `cap` per category so lists stay varied */
  const pick = (scored, n, cap = 2) => { const used = {}, out = []; scored.sort((a, b) => b.s - a.s || b.p.reviews - a.p.reviews).forEach(({ p }) => { used[p.category] = used[p.category] || 0; if (out.length < n && used[p.category] < cap) { used[p.category]++; out.push(p); } }); return out; };

  /* ---------- signals ---------- */
  const viewed = { get: () => ls.get('fm_viewed', []).map(byId).filter(Boolean), add(id) { id = +id; if (byId(id)) ls.set('fm_viewed', [id, ...ls.get('fm_viewed', []).filter((x) => x !== id)].slice(0, 12)); }, clear() { ls.set('fm_viewed', []); } };
  const orders = () => { const u = window.FM_AUTH && FM_AUTH.user(); return ls.get('fm_orders', []).filter((o) => o.status !== 'Cancelled' && (!o.uid || (u && o.uid === u.id))); };

  /* ---------- engines ---------- */
  function similar(p, n = 4) {
    return pick(FM.products.filter((x) => x.id !== p.id && x.stock > 0).map((x) => ({ p: x, s: (x.category === p.category ? 3 : 0) + (x.brand === p.brand ? 2 : 0) + (Math.abs(x.price - p.price) <= p.price * 0.4 ? 1 : 0) + quality(x) })).filter((x) => x.s >= 2), n, n);
  }
  function forCart(items, n = 4) {            // items: [{ p, q }] from FM_CART.totals().items
    const have = new Set(items.map((i) => i.p.id)), cats = new Set(items.map((i) => i.p.category)), brands = new Set(items.map((i) => i.p.brand)), want = {};
    cats.forEach((c) => (PAIRS[c] || []).forEach((x) => (want[x] = (want[x] || 0) + 1)));
    return pick(FM.products.filter((p) => !have.has(p.id) && p.stock > 0).map((p) => ({ p, s: (want[p.category] || 0) * 2 + (brands.has(p.brand) ? 1 : 0) + (cats.has(p.category) ? 0.5 : 0) + quality(p) })), n);
  }
  function bundle(p) {                         // two add-ons from categories that pair with p
    const cats = PAIRS[p.category] || [], out = [];
    cats.forEach((c) => { const best = FM.products.filter((x) => x.category === c && x.stock > 0 && !inCart(x.id)).sort((a, b) => quality(b) - quality(a) || b.reviews - a.reviews)[0]; if (best && out.length < 2) out.push(best); });
    return out;
  }
  function personal(n = 8) {
    const c = {}, b = {}; let any = false;
    const add = (p, w) => { if (p) { any = true; c[p.category] = (c[p.category] || 0) + w; b[p.brand] = (b[p.brand] || 0) + w; } };
    viewed.get().forEach((p) => add(p, 1)); ls.get('fm_wish', []).forEach((id) => add(byId(id), 2)); Object.keys(ls.get('fm_cart', {})).forEach((id) => add(byId(id), 2)); orders().forEach((o) => o.items.forEach((i) => add(byId(i.id), 3)));
    if (!any) return { list: FM.sets.recommended.map(byId).filter(Boolean).slice(0, n), personal: false };
    return { list: pick(FM.products.filter((p) => p.stock > 0 && !inCart(p.id)).map((p) => ({ p, s: (c[p.category] || 0) + (b[p.brand] || 0) * 0.7 + quality(p) * 2 })), n, 3), personal: true };
  }
  function buyAgain(n = 4) {
    const seen = {}; orders().forEach((o, idx) => o.items.forEach((i) => { const r = seen[i.id] = seen[i.id] || { n: 0, first: idx }; r.n += 1; }));
    return Object.entries(seen).sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first).map(([id]) => byId(id)).filter((p) => p && p.stock > 0 && !inCart(p.id)).slice(0, n);
  }

  /* ---------- markup ---------- */
  const cards = (list) => FM_APP.cards(list);
  const block = (eyebrow, title, list, cls = '') => (list.length ? `<div class="head-row">${SectionHeading({ eyebrow, title })}</div><div class="product-grid ${cls}">${cards(list)}</div>` : '');
  const thumb = (p) => `<span class="ci-thumb" style="--tint:${(FM.categories.find((c) => c.id === p.category) || {}).tint || '#EEF6E4'}"><img src="${root()}${p.image}" alt="" onerror="this.remove()"><span>${p.emoji}</span></span>`;

  function bundleHtml(p) {
    const extra = bundle(p); if (!extra.length) return '';
    const all = [p, ...extra], total = all.reduce((s, x) => s + x.price, 0), mrp = all.reduce((s, x) => s + (x.originalPrice || x.price), 0);
    return `<section class="pd-section" aria-label="Frequently bought together">${SectionHeading({ eyebrow: 'Make it a basket', title: 'Frequently bought together' })}
      <div class="bundle panel"><div class="bundle-items">${all.map((x) => `<a class="bundle-item" href="${U.productUrl(x)}">${thumb(x)}<b>${esc(x.name)}</b><small>${esc(x.weight)} · ${rupee(x.price)}</small></a>`).join('<span class="bundle-plus" aria-hidden="true">+</span>')}</div>
        <div class="bundle-buy"><small>Total for ${all.length} items</small><b>${rupee(total)}</b>${mrp > total ? `<s>${rupee(mrp)}</s>` : ''}<button type="button" class="btn btn-primary" data-rec="bundle" data-ids="${all.map((x) => x.id).join(',')}">Add all ${all.length} to cart</button></div></div></section>`;
  }
  const product = (p) => bundleHtml(p) + (viewed.get().filter((x) => x.id !== p.id).length ? `<section class="pd-section">${block('Pick up where you left off', 'Recently viewed', viewed.get().filter((x) => x.id !== p.id).slice(0, 4))}</section>` : '');
  const dash = () => { const r = personal(4); return `${buyAgain(4).length ? `<div class="pane-head"><h3>Buy it again</h3></div><div class="product-grid dash-grid">${cards(buyAgain(4))}</div>` : ''}<div class="pane-head"><h3>${r.personal ? 'Recommended for you' : 'Popular right now'}</h3></div><div class="product-grid dash-grid">${cards(r.list.slice(0, 4))}</div>`; };

  function home() {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('buyagain', block('Your usuals', 'Buy it again', buyAgain(4)));
    set('recent', block('Pick up where you left off', 'Recently viewed', viewed.get().slice(0, 4)));
    const r = personal(8); if (r.personal) set('recommended', block('Picked for you', 'Recommended for you', r.list));
    window.lucide && lucide.createIcons();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rec="bundle"]'); if (!b || !window.FM_CART) return;
    const ids = b.dataset.ids.split(',').map(Number); let capped = false; ids.forEach((id) => { if (FM_CART.add(id, 1).capped) capped = true; });
    Toast && Toast.show(capped ? 'Added — some items are at their per-order limit' : `${ids.length} items added to your cart`, capped ? 'info' : 'success');
  });

  window.FM_REC = { viewed, similar, forCart, bundle, personal, buyAgain, home, product, dash };
})();
