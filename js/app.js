/* FRESHMART — app logic: state, events, homepage + shop rendering. */
(function () {
  const { ProductCard, SectionHeading, CategoryTile, Testimonial, Toast, rupee, mount, icon } = FM_UI;
  const $ = (s) => document.querySelector(s);
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const root = document.body.dataset.root || '';
  const state = { city: load('fm_city', 'Lucknow'), cat: 'all', q: '' };
  const byId = (id) => FM.products.find(p => p.id === +id);
  const icons = () => window.lucide && lucide.createIcons();
  const shopUrl = (qs) => `${root}pages/shop.html?${qs}`;
  const onShop = () => !!$('#product-grid');
  const cards = (list) => list.map(p => ProductCard(p, FM_CART.wished(p.id))).join('');

  /* ---------- shop page (logic lives in js/shop.js) ---------- */
  function setCategory(cat) {
    if (!onShop()) return (location.href = shopUrl('cat=' + cat));
    FM_SHOP.set({ category: cat === 'all' ? [] : [cat], q: '' });
  }
  function search(q) {
    q = q.trim(); if (window.FM_SEARCH) FM_SEARCH.recent.add(q);
    const sp = $('#search-suggest'); if (sp) sp.hidden = true;
    if (!onShop()) return (location.href = shopUrl('q=' + encodeURIComponent(q)));
    FM_SHOP.set({ q, category: [] });
  }

  /* ---------- homepage ---------- */
  const head = (o, link) => `<div class="head-row">${SectionHeading(o)}<a class="view-all" href="${link}">View all ${icon('arrow-right', 'w-4 h-4')}</a></div>`;
  function section(id, o, list, link, rail) {
    const el = $('#' + id); if (!el) return;
    el.innerHTML = head(o, link) + (rail
      ? `<div class="rail-wrap"><button class="rail-btn l" data-action="rail" data-dir="-1" data-target="${id}-rail" aria-label="Scroll left">${icon('chevron-left')}</button>
         <div class="rail" id="${id}-rail">${cards(list)}</div>
         <button class="rail-btn r" data-action="rail" data-dir="1" data-target="${id}-rail" aria-label="Scroll right">${icon('chevron-right')}</button></div>`
      : `<div class="product-grid">${cards(list)}</div>`);
  }
  const ofCats = (cats) => FM.products.filter(p => cats.includes(p.category)).slice(0, 8);
  const ofIds = (ids) => ids.map(byId);

  function renderHome() {
    $('#category-heading').innerHTML = SectionHeading({ eyebrow: 'Shop by category', title: 'Everything your kitchen needs' });
    $('#category-tiles').innerHTML = FM.categories.map(c => CategoryTile(c, shopUrl('cat=' + c.id))).join('');
    section('best', { eyebrow: 'Customer favourites', title: 'Best Sellers' }, ofIds(FM.sets.best), shopUrl('cat=all'), true);
    section('produce', { eyebrow: 'Farm fresh', title: 'Fresh Fruits & Vegetables' }, ofCats(['fruits-vegetables']), shopUrl('cat=fruits-vegetables'));
    section('dairybakery', { eyebrow: 'Daily essentials', title: 'Dairy & Bakery' }, ofCats(['dairy-bakery']), shopUrl('cat=dairy-bakery'));
    section('snacksbev', { eyebrow: 'Treat yourself', title: 'Snacks & Beverages' }, ofCats(['snacks', 'beverages']), shopUrl('cat=snacks'));
    section('organic', { eyebrow: 'Clean & green', title: 'Organic & Healthy' }, ofCats(['organic']), shopUrl('cat=organic'));
    $('#flash-grid').innerHTML = cards(ofIds(FM.sets.flash));
    section('weekly', { eyebrow: 'This week only', title: 'Weekly Special Offers' }, ofIds(FM.sets.weekly), shopUrl('cat=all'));
    $('#brand-heading').innerHTML = SectionHeading({ eyebrow: 'Trusted names', title: 'Featured Brands' });
    $('#brand-row').innerHTML = FM.brands.map(b => `<a class="brand" href="${shopUrl('q=' + encodeURIComponent(b))}">${b}</a>`).join('');
    section('recommended', { eyebrow: 'Picked for you', title: 'Recommended Products' }, ofIds(FM.sets.recommended), shopUrl('cat=all'));
    $('#testi-heading').innerHTML = SectionHeading({ eyebrow: 'Loved by shoppers', title: 'What customers say' });
    $('#testi-grid').innerHTML = FM.testimonials.map(Testimonial).join('');
    countdown();
    window.FM_REC && FM_REC.home();
  }

  /* Flash sale resets daily at local midnight */
  function countdown() {
    const p = (v) => String(v).padStart(2, '0');
    const tick = () => {
      const n = new Date(), end = new Date(n); end.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((end - n) / 1000));
      $('#cd-h').textContent = p(Math.floor(s / 3600)); $('#cd-m').textContent = p(Math.floor(s % 3600 / 60)); $('#cd-s').textContent = p(s % 60);
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- header panels ---------- */
  const panels = [['#loc-panel', '[data-action="toggle-loc"]'], ['#mega', '[data-action="toggle-mega"]']];
  function closePanels(except) { panels.forEach(([p, b]) => { if (p !== except) { $(p).hidden = true; $(b).setAttribute('aria-expanded', 'false'); } }); }
  function toggle(panel, btn) { const open = $(panel).hidden; closePanels(panel); $(panel).hidden = !open; btn.setAttribute('aria-expanded', String(open)); }

  const actions = {
    add(btn) {
      const n = Math.max(1, +btn.dataset.qty || 1), r = FM_CART.add(btn.dataset.id, n);
      if (r.capped) Toast.show(`Only ${r.max} of ${r.p.name} per order`, 'info');
      else Toast.show(`${n > 1 ? n + ' × ' : ''}${r.p.name} added to cart`);
    },
    wish(btn) { const on = FM_CART.toggleWish(btn.dataset.id); Toast.show(on ? 'Saved to wishlist' : 'Removed from wishlist', 'info'); },
    rail(btn) { $('#' + btn.dataset.target).scrollBy({ left: btn.dataset.dir * 480, behavior: 'smooth' }); },
    'show-cart'() { FM_CART.open(); },
    account() { FM_AUTH.accountPage(); },
    soon(btn) { Toast.show(`${btn.dataset.label} page arrives in a later part`, 'info'); },
    'toggle-loc'(btn) { toggle('#loc-panel', btn); },
    'toggle-mega'(btn) { toggle('#mega', btn); },
    'set-loc'(btn) { state.city = btn.dataset.city; save('fm_city', state.city); $('#loc-label').textContent = state.city; closePanels(); Toast.show(`Delivering to ${state.city}`); },
    'toggle-menu'(btn) { btn.setAttribute('aria-expanded', String($('#main-nav').classList.toggle('open'))); },
    'close-announce'() { $('#announce').remove(); }
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action]');
    if (a && actions[a.dataset.action]) return actions[a.dataset.action](a);
    const c = e.target.closest('[data-cat]');
    if (c) { closePanels(); $('#main-nav').classList.remove('open'); return setCategory(c.dataset.cat); }
    if (!e.target.closest('.loc-wrap, .mega-wrap')) closePanels();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
  document.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.id === 'search-form') { e.preventDefault(); return search($('#search-input').value); }
    if (f.dataset.newsletter) {
      e.preventDefault();
      const v = f.elements.email.value.trim(), msg = f.querySelector('.news-msg');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = 'Please enter a valid email address.'; return; }
      save('fm_' + f.dataset.newsletter, v); msg.textContent = ''; f.reset();
      Toast.show(f.dataset.newsletter === 'app' ? "You're on the list — we'll email you at launch." : 'Subscribed! Fresh offers are on the way.');
    }
  });

  /* ---------- init ---------- */
  mount();
  window.FM_AUTH && FM_AUTH.syncHeader();
  window.FM_SEARCH && FM_SEARCH.init();
  $('#loc-label').textContent = state.city;
  window.FM_APP = { cards, wished: (id) => FM_CART.wished(id) };
  FM_CART.init();                                   // badges, drawer, cart/wishlist pages
  const standalone = $('#cart-root') || $('#wish-root') || $('#checkout-root') || $('#success-root') || $('#auth-root') || $('#dash-root') || $('#page-root');
  if (onShop()) FM_SHOP.init(); else if ($('#product-root')) FM_PRODUCT.init(); else if ($('#checkout-root') || $('#success-root')) FM_CHECKOUT.init(); else if ($('#auth-root')) FM_AUTH.init(); else if ($('#dash-root')) FM_DASH.init(); else if ($('#page-root')) FM_PAGES.init(); else if (!standalone) renderHome();
  /* hero photo (optional): applied only if assets/banners/hero.jpg exists */
  const hero = $('.hero[data-hero]');
  if (hero) { const src = new URL(root + hero.dataset.hero, location.href).href, im = new Image(); im.onload = () => hero.style.setProperty('--hero-img', `url("${src}")`); im.src = src; }
  icons();
})();
