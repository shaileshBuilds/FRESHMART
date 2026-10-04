/* FRESHMART — Part 07: cart + wishlist.
   One store (FM_CART) is the single source of truth: persisted in localStorage, synced across tabs, drives the header badges,
   product-card steppers, the slide-in cart drawer, pages/cart.html and pages/wishlist.html. */
(function () {
  const U = window.FM_UI || {}, { Toast, rupee, icon } = U;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => document.body.dataset.root || '';
  const KC = 'fm_cart', KW = 'fm_wish', KP = 'fm_coupon', FEE = 40, CAP = 10;
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const byId = (id) => FM.products.find((p) => p.id === +id);
  const maxQty = (p) => Math.min(CAP, p.stock);
  const COUPONS = {
    FRESH10: { min: 299, label: '10% off, up to ₹150', off: (s) => Math.min(Math.round(s * 0.1), 150) },
    WELCOME50: { min: 399, label: '₹50 off orders above ₹399', off: () => 50 },
    FREESHIP: { min: 199, label: 'Free delivery above ₹199', off: () => 0, ship: true },
    GREEN15: { min: 299, label: '15% off fruits, vegetables & organic, up to ₹120', cats: ['fruits-vegetables', 'organic'], off: (base) => Math.min(Math.round(base * 0.15), 120) },
    BIG200: { min: 1499, label: '₹200 off orders above ₹1,499', until: '2026-12-31', off: () => 200 },
    FIRST100: { min: 599, label: '₹100 off your first order', first: true, off: () => 100 }
  };
  const isFirstOrder = () => !ls.get('fm_orders', []).some((o) => o.status !== 'Cancelled');
  /* One rule check used by totals(), applyCoupon() and the offers list. `base` = spend the coupon applies to (whole cart, or only its categories). */
  function check(c, items, sub) {
    const d = COUPONS[c]; if (!d) return { ok: false, msg: `“${esc(c)}” isn’t a valid code.` };
    if (d.until && Date.now() > new Date(d.until + 'T23:59:59').getTime()) return { ok: false, msg: `${c} has expired.` };
    if (d.first && !isFirstOrder()) return { ok: false, msg: `${c} is for first orders only.` };
    if (sub < d.min) return { ok: false, msg: `Add ${rupee(d.min - sub)} more to use ${c}.` };
    const base = d.cats ? items.filter((i) => d.cats.includes(i.p.category)).reduce((s, i) => s + i.p.price * i.q, 0) : sub;
    if (d.cats && !base) return { ok: false, msg: `${c} needs fruits, vegetables or organic items in your cart.` };
    return { ok: true, discount: Math.min(d.off(base), sub), ship: !!d.ship };
  }

  let cart = {}, wish = [], code = '', lastRemoved = null, drawerOpen = false, returnFocus = null;
  function hydrate() {
    cart = {}; Object.entries(ls.get(KC, {})).forEach(([id, q]) => { const p = byId(id); if (p && +q > 0) cart[p.id] = Math.min(+q | 0, maxQty(p)); });
    wish = [...new Set(ls.get(KW, []).map(Number))].filter(byId); code = COUPONS[ls.get(KP, '')] ? ls.get(KP, '') : '';
  }
  hydrate();

  /* ---------- store ---------- */
  const qty = (id) => cart[id] || 0;
  const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
  function totals() {
    const items = Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter((i) => i.p);
    let n = 0, mrp = 0, sub = 0;
    items.forEach(({ p, q }) => { n += q; mrp += (p.originalPrice || p.price) * q; sub += p.price * q; });
    const c = COUPONS[code], r = c ? check(code, items, sub) : { ok: false }, ok = r.ok;
    const discount = ok ? r.discount : 0, freeShip = sub >= FM.freeDeliveryMin || (ok && r.ship);
    const delivery = n ? (freeShip ? 0 : FEE) : 0;
    return { items, count: n, mrp, sub, savings: mrp - sub, code: c ? code : '', discount, couponNote: c && !ok ? r.msg : '',
      freeShip, delivery, total: sub - discount + delivery, toFree: Math.max(0, FM.freeDeliveryMin - sub), pct: Math.min(100, Math.round((sub / FM.freeDeliveryMin) * 100)), allSaved: mrp - sub + discount };
  }
  function persist() { ls.set(KC, cart); ls.set(KW, wish); ls.set(KP, code); }
  function emit(kind) { persist(); ui(kind); }
  const store = {
    add(id, n = 1) { const p = byId(id); if (!p) return { added: 0 }; const q = qty(p.id), nq = Math.min(q + n, maxQty(p)); cart[p.id] = nq; emit('cart'); return { added: nq - q, capped: q + n > maxQty(p), max: maxQty(p), p }; },
    setQty(id, n) { const p = byId(id); if (!p) return; n = Math.min(Math.max(0, n | 0), maxQty(p)); n ? (cart[p.id] = n) : delete cart[p.id]; emit('cart'); },
    remove(id) { const q = qty(id); if (!q) return; lastRemoved = { id: +id, q }; delete cart[id]; emit('cart'); return lastRemoved; },
    clear() { cart = {}; code = ''; emit('cart'); },
    wished: (id) => wish.includes(+id),
    toggleWish(id) { id = +id; const i = wish.indexOf(id); i > -1 ? wish.splice(i, 1) : wish.unshift(id); emit('wish'); return i === -1; },
    moveToWish(id) { id = +id; if (!wish.includes(id)) wish.unshift(id); delete cart[id]; emit('both'); },
    wishAllToCart() { let n = 0; wish.forEach((id) => { if (!qty(id)) { cart[id] = 1; n++; } }); emit('both'); return n; },
    clearWish() { wish = []; emit('wish'); },
    applyCoupon(c) {
      c = String(c || '').trim().toUpperCase(); const d = COUPONS[c], t = totals();
      if (!c) return { ok: false, msg: 'Enter a coupon code.' };
      if (!d) return { ok: false, msg: `“${esc(c)}” isn’t a valid code.` };
      if (!t.count) return { ok: false, msg: 'Add items to your cart first.' };
      const r = check(c, t.items, t.sub); if (!r.ok) return { ok: false, msg: r.msg };
      code = c; emit('cart'); return { ok: true, msg: `${c} applied.` };
    },
    removeCoupon() { code = ''; emit('cart'); },
    /* every coupon with its status for the current cart: [{ code, d, ok, msg, value }], usable first, biggest saving first */
    offers() {
      const t = totals();
      return Object.entries(COUPONS).map(([c, d]) => { const r = check(c, t.items, t.sub), ship = r.ok && r.ship && t.sub < FM.freeDeliveryMin ? FEE : 0; return { code: c, d, ok: r.ok && !!t.count, msg: t.count ? r.msg : 'Add items to use this offer.', value: r.ok ? r.discount + ship : 0 }; })
        .sort((a, b) => b.ok - a.ok || b.value - a.value);
    },
    bestOffer() { return store.offers().find((o) => o.ok && o.value > 0) || null; },
    totals, count, qty, maxQty, COUPONS, undo() { if (!lastRemoved) return; cart[lastRemoved.id] = lastRemoved.q; lastRemoved = null; emit('cart'); }
  };

  /* ---------- markup ---------- */
  const url = (p) => `${root()}pages/product.html?id=${p.id}`;
  const tint = (p) => (FM.categories.find((c) => c.id === p.category) || {}).tint || '#EEF6E4';
  const stepper = (p, q) => `<div class="step" role="group" aria-label="Quantity of ${esc(p.name)}">
    <button type="button" data-cart="down" data-id="${p.id}" aria-label="${q === 1 ? 'Remove' : 'Decrease quantity of'} ${esc(p.name)}">${icon(q === 1 ? 'trash-2' : 'minus', 'w-4 h-4')}</button>
    <output aria-live="polite">${q}</output>
    <button type="button" data-cart="up" data-id="${p.id}" ${q >= maxQty(p) ? 'disabled' : ''} aria-label="Increase quantity of ${esc(p.name)}">${icon('plus', 'w-4 h-4')}</button></div>`;
  const slot = (p) => qty(p.id) ? stepper(p, qty(p.id)) : U.Button({ label: 'Add', icon: 'plus', action: 'add', attrs: `data-id="${p.id}"`, size: 'sm' });
  const lineItem = ({ p, q }, big) => `<li class="ci ${big ? 'ci-lg' : ''}">
    <a class="ci-thumb" href="${url(p)}" style="--tint:${tint(p)}" tabindex="-1" aria-hidden="true"><img src="${root()}${p.image}" alt="" onerror="this.remove()"><span>${p.emoji}</span></a>
    <div class="ci-body"><a class="ci-name" href="${url(p)}">${esc(p.name)}</a><small>${esc(p.weight)} · ${rupee(p.price)} each</small>
      <div class="ci-actions">${stepper(p, q)}<button type="button" class="ci-link" data-cart="save" data-id="${p.id}">Save for later</button><button type="button" class="ci-link" data-cart="rm" data-id="${p.id}">Remove</button></div></div>
    <div class="ci-price"><b>${rupee(p.price * q)}</b>${p.originalPrice > p.price ? `<s>${rupee(p.originalPrice * q)}</s>` : ''}</div></li>`;
  const shipBar = (t) => t.count ? `<div class="ship"><p>${t.freeShip ? '<b>Free delivery unlocked</b>' : `Add <b>${rupee(t.toFree)}</b> more for free delivery`}</p><div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t.freeShip ? 100 : t.pct}"><i style="width:${t.freeShip ? 100 : t.pct}%"></i></div></div>` : '';
  const emptyBlock = (ic, title, text, cta) => `<div class="empty-state">${icon(ic, 'w-10 h-10')}<h3>${title}</h3><p>${text}</p>${cta}</div>`;
  const shopBtn = `<a class="btn btn-primary" href="${root()}pages/shop.html?cat=all">Start shopping</a>`;

  /* ---------- drawer ---------- */
  let drawer, overlay;
  function drawerHtml() {
    const t = totals();
    const body = t.count ? `${shipBar(t)}<ul class="ci-list">${t.items.map((i) => lineItem(i)).join('')}</ul>` : emptyBlock('shopping-bag', 'Your cart is empty', 'Add fresh picks and they’ll show up here.', shopBtn.replace('<a ', '<a data-cart="close" '));
    const foot = t.count ? `<div class="drawer-foot"><div class="sum-row"><span>Subtotal</span><b>${rupee(t.sub)}</b></div>${t.allSaved > 0 ? `<p class="saved">${icon('badge-percent', 'w-4 h-4')}You’re saving ${rupee(t.allSaved)}</p>` : ''}<small>Delivery fee and coupons are applied in your cart.</small>
      <div class="drawer-btns"><a class="btn btn-outline" href="${root()}pages/cart.html">View cart</a><button type="button" class="btn btn-primary" data-cart="checkout">Checkout · ${rupee(t.sub)}</button></div></div>` : '';
    return `<div class="drawer-head"><h2>Your cart <span>(${t.count})</span></h2><button type="button" class="icon-btn" data-cart="close" aria-label="Close cart">${icon('x')}</button></div><div class="drawer-body">${body}</div>${foot}`;
  }
  function buildDrawer() {
    overlay = document.createElement('div'); overlay.className = 'drawer-overlay'; overlay.dataset.cart = 'close';
    drawer = document.createElement('aside'); drawer.className = 'drawer'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Shopping cart'); drawer.setAttribute('aria-hidden', 'true');
    document.body.append(overlay, drawer);
  }
  function open() {
    if ($('#cart-root')) return $('#cart-root').scrollIntoView({ behavior: 'smooth' });
    returnFocus = document.activeElement; drawerOpen = true; drawer.innerHTML = drawerHtml(); window.lucide && lucide.createIcons();
    overlay.classList.add('show'); drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.classList.add('no-scroll');
    const f = $('[data-cart="close"]', drawer); f && f.focus();
  }
  function close() {
    if (!drawerOpen) return; drawerOpen = false; overlay.classList.remove('show'); drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); document.body.classList.remove('no-scroll');
    returnFocus && returnFocus.focus && returnFocus.focus();
  }

  /* ---------- pages ---------- */
  const suggestions = (t) => {
    if (window.FM_REC) return FM_REC.forCart(t.items, 4);
    const cats = new Set(t.items.map((i) => i.p.category));
    return FM.products.filter((p) => !qty(p.id) && (!cats.size || cats.has(p.category))).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 4);
  };
  function cartPage() {
    const el = $('#cart-root'); if (!el) return; const t = totals();
    if (!t.count) { el.innerHTML = emptyBlock('shopping-bag', 'Your cart is empty', 'Browse the shop and add a few fresh picks.', shopBtn) + `<section class="pd-section">${U.SectionHeading({ eyebrow: 'Popular right now', title: 'Start with a best seller' })}<div class="product-grid">${FM_APP.cards(FM.sets.best.slice(0, 4).map(byId))}</div></section>`; return; }
    const row = (l, v, cls = '') => `<div class="sum-row ${cls}"><span>${l}</span><b>${v}</b></div>`;
    const best = !code && store.bestOffer(), fmtUntil = (u) => new Date(u + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const chips = `${best ? `<p class="best-offer">${icon('sparkles', 'w-4 h-4')}<span>Best offer: save <b>${rupee(best.value)}</b> with <b>${best.code}</b></span><button type="button" class="ci-link" data-cart="coupon-pick" data-code="${best.code}">Apply</button></p>` : ''}
      <ul class="offers" aria-label="Available offers">${store.offers().map((o) => `<li class="offer ${o.ok ? '' : 'off'}"><div><b>${o.code}</b><small>${esc(o.d.label)}${o.d.until ? ` · valid till ${fmtUntil(o.d.until)}` : ''}</small>${o.ok ? '' : `<small class="why">${esc(o.msg)}</small>`}</div><button type="button" class="btn btn-outline btn-sm" data-cart="coupon-pick" data-code="${o.code}" ${o.ok ? '' : 'disabled'}>Apply</button></li>`).join('')}</ul>`;
    el.innerHTML = `<div class="cart-layout">
      <section aria-label="Cart items"><div class="cart-card">${shipBar(t)}<ul class="ci-list">${t.items.map((i) => lineItem(i, true)).join('')}</ul></div>
        <div class="cart-tools"><a class="ci-link" href="${root()}pages/shop.html?cat=all">${icon('arrow-left', 'w-4 h-4')} Continue shopping</a><button type="button" class="ci-link" data-cart="clear">Clear cart</button></div></section>
      <aside class="summary" aria-label="Order summary"><h2>Order summary</h2>
        <form id="coupon-form" class="coupon" novalidate>${code ? `<div class="coupon-on">${icon('ticket-percent', 'w-4 h-4')}<span><b>${code}</b> applied</span><button type="button" class="ci-link" data-cart="coupon-rm">Remove</button></div>` :
          `<label for="coupon-input">Have a coupon?</label><div class="coupon-field"><input id="coupon-input" placeholder="Enter code" autocomplete="off" autocapitalize="characters"><button class="btn btn-outline btn-sm" type="submit">Apply</button></div><div class="offer-box">${chips}</div>`}
          <p class="coupon-msg ${t.couponNote ? 'err' : ''}" id="coupon-msg" aria-live="polite">${t.couponNote}</p></form>
        ${row(`Items (${t.count})`, rupee(t.mrp))}${t.savings ? row('Product discount', '− ' + rupee(t.savings), 'good') : ''}${t.discount ? row(`Coupon (${t.code})`, '− ' + rupee(t.discount), 'good') : ''}
        ${row('Delivery', t.delivery ? rupee(t.delivery) : 'Free', t.delivery ? '' : 'good')}${row('Total', rupee(t.total), 'total')}
        ${t.allSaved > 0 ? `<p class="saved">${icon('badge-percent', 'w-4 h-4')}You’re saving ${rupee(t.allSaved)} on this order</p>` : ''}
        <button type="button" class="btn btn-primary btn-lg w-full" data-cart="checkout">Proceed to checkout</button><small class="muted-s">Taxes included. Delivering to your saved city.</small></aside></div>
      <section class="pd-section">${U.SectionHeading({ eyebrow: 'Complete your basket', title: 'You might also like' })}<div class="product-grid">${FM_APP.cards(suggestions(t))}</div></section>`;
  }
  function wishPage() {
    const el = $('#wish-root'); if (!el) return; const list = wish.map(byId).filter(Boolean);
    if (!list.length) { el.innerHTML = emptyBlock('heart', 'Your wishlist is empty', 'Tap the heart on any product to save it for later.', shopBtn); return; }
    el.innerHTML = `<div class="toolbar"><p class="text-muted text-sm">${list.length} saved item${list.length === 1 ? '' : 's'}</p><span style="flex:1"></span>
      <button type="button" class="btn btn-primary btn-sm" data-cart="wish-all">${icon('shopping-bag', 'w-4 h-4')}Add all to cart</button><button type="button" class="btn btn-outline btn-sm" data-cart="wish-clear">Clear wishlist</button></div>
      <div class="product-grid">${FM_APP.cards(list)}</div>`;
  }

  /* ---------- sync UI ---------- */
  function keepFocus(fn) {
    const a = document.activeElement, k = a && a.dataset && a.dataset.cart, id = a && a.dataset && a.dataset.id, inDrawer = a && drawer && drawer.contains(a);
    fn();
    if (k && id) { const scope = inDrawer ? drawer : document; const n = $(`[data-cart="${k}"][data-id="${id}"]`, scope) || $(`[data-cart="${k === 'down' ? 'up' : 'down'}"][data-id="${id}"]`, scope); n && n.focus(); }
  }
  let lastCount = count();
  function ui(kind) {
    keepFocus(() => {
      const c = count(), cc = $('#cart-count'), wc = $('#wish-count');
      if (cc) { cc.textContent = c; if (c > lastCount) { cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump'); } }
      if (wc) wc.textContent = wish.length; lastCount = c;
      $$('.add-slot').forEach((el) => { const p = byId(el.dataset.id), q = String(qty(el.dataset.id)); if (p && el.dataset.q !== q) { el.innerHTML = slot(p); el.dataset.q = q; } });
      $$('.wish-btn[data-id]').forEach((b) => { const on = wish.includes(+b.dataset.id); b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
      if (drawerOpen) { const body = $('.drawer-body', drawer), top = body ? body.scrollTop : 0; drawer.innerHTML = drawerHtml(); const nb = $('.drawer-body', drawer); nb && (nb.scrollTop = top); }
      if (kind !== 'wish') cartPage(); if (kind !== 'cart') wishPage();
    });
    window.lucide && lucide.createIcons();
  }

  /* ---------- events ---------- */
  const toast = (m, t) => Toast && Toast.show(m, t);
  const A = {
    up(id) { const r = store.add(id, 1); if (r.capped) toast(`Maximum ${r.max} per order`, 'info'); },
    down(id) { const q = qty(id); q > 1 ? store.setQty(id, q - 1) : A.rm(id); },
    rm(id) { const p = byId(id); store.remove(id); toast(`${esc(p.name)} removed <button type="button" class="toast-undo" data-cart="undo">Undo</button>`, 'info'); },
    save(id) { store.moveToWish(id); toast(`${esc(byId(id).name)} saved for later`); },
    undo() { store.undo(); },
    open, close,
    clear() { if (confirm('Remove all items from your cart?')) { store.clear(); toast('Cart cleared', 'info'); } },
    checkout() { close(); if (!count()) return toast('Your cart is empty', 'info'); location.href = `${root()}pages/checkout.html`; },
    'wish-all'() { const n = store.wishAllToCart(); toast(n ? `${n} item${n === 1 ? '' : 's'} added to cart` : 'Everything is already in your cart', n ? 'success' : 'info'); },
    'wish-clear'() { if (confirm('Remove all items from your wishlist?')) store.clearWish(); },
    'coupon-rm'() { store.removeCoupon(); toast('Coupon removed', 'info'); },
    'coupon-pick'(id, el) { applyFromUi(el.dataset.code); }
  };
  function applyFromUi(v) {
    const r = store.applyCoupon(v);
    if (r.ok) toast(`${r.msg} Savings added to your order.`); else { const m = $('#coupon-msg'); if (m) { m.textContent = r.msg; m.className = 'coupon-msg err'; } }
  }
  function init() {
    buildDrawer();
    const ph = $('#page-heading'); if (ph) ph.innerHTML = U.SectionHeading($('#cart-root') ? { eyebrow: 'Review', title: 'Your cart' } : { eyebrow: 'Saved for later', title: 'Your wishlist' });
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-cart]'); if (!el || !A[el.dataset.cart]) return;
      if (el.tagName === 'A' && el.dataset.cart === 'close') { close(); return; }
      A[el.dataset.cart](el.dataset.id, el);
    });
    document.addEventListener('submit', (e) => { if (e.target.id === 'coupon-form') { e.preventDefault(); applyFromUi($('#coupon-input').value); } });
    document.addEventListener('keydown', (e) => {
      if (!drawerOpen) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') { const f = $$('a[href],button:not([disabled])', drawer); if (!f.length) return; const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    window.addEventListener('storage', (e) => { if ([KC, KW, KP].includes(e.key)) { hydrate(); ui('both'); } });   // other tab changed
    ui('both');
  }
  window.FM_CART = Object.assign(store, { init, open, close, slot, byId });
})();
