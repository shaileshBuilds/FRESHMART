/* FRESHMART — Part 10: Offers, About, Contact and FAQ pages.
   Each page has <div id="page-root" data-page="offers|about|contact|faq">; this file renders it with the shared FM_UI helpers.
   Offers reuse the real coupons from FM_CART, product cards from FM_APP and the shop's discount filters.
   Contact messages are saved in this browser only (fm_messages): there is no server in this demo.
   Content marked SAMPLE (contact details, returns policy) should be replaced with your real details. */
(function () {
  const U = window.FM_UI || {}, { Toast, rupee, icon, SectionHeading } = U;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => document.body.dataset.root || '';
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const icons = () => window.lucide && lucide.createIcons();
  const href = (f) => `${root()}pages/${f}`;
  const shop = (qs) => href('shop.html?' + qs);
  const FEE = 40, COD_LIMIT = 5000;                              // keep in step with js/cart.js and js/checkout.js
  const SITE = { email: 'support@freshmart.example', phone: '1800 000 0000', tel: '18000000000', hours: 'Every day, 7 AM – 10 PM', address: 'FRESHMART Fulfilment Centre, Lucknow, Uttar Pradesh, India' };   // SAMPLE
  const hero = (eyebrow, title, text) => `<section class="pg-hero"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${text}</p></section>`;

  /* =================== OFFERS =================== */
  const TIERS = [[0, 'All deals'], [10, '10% or more'], [15, '15% or more'], [20, '20% or more']];
  const deals = (t) => FM.products.filter((p) => p.discount > 0 && p.discount >= t).sort((a, b) => b.discount - a.discount || b.reviews - a.reviews);
  const maxOff = (id) => FM.products.filter((p) => p.category === id).reduce((m, p) => Math.max(m, p.discount || 0), 0);
  const dealsLink = (t) => shop((t ? `discount=${t}&` : '') + 'sort=discount');

  function offers() {
    const C = FM_CART.COUPONS, byId = (id) => FM.products.find((p) => p.id === id);
    const coupons = Object.entries(C).map(([code, c]) => `<article class="coupon panel"><span class="coupon-code">${esc(code)}</span><p>${esc(c.label)}</p><small>Minimum order ${rupee(c.min)}${c.first ? ' · First order only' : ''}${c.until ? ' · Valid till ' + new Date(c.until + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</small>
      <div class="co-actions"><button type="button" class="btn btn-outline btn-sm" data-pg="copy" data-code="${esc(code)}">${icon('copy', 'w-4 h-4')}Copy code</button><button type="button" class="btn btn-primary btn-sm" data-pg="apply" data-code="${esc(code)}">Apply to cart</button></div></article>`).join('');
    const cats = FM.categories.filter((c) => maxOff(c.id) > 0).map((c) => `<a class="deal-cat" href="${shop('cat=' + c.id + '&sort=discount')}" style="--tint:${c.tint || '#EEF6E4'}"><span class="cat-ico">${icon(c.icon, 'w-6 h-6')}</span><span><b>${esc(c.name)}</b><small>Up to ${maxOff(c.id)}% off</small></span>${icon('arrow-right', 'w-4 h-4')}</a>`).join('');
    return `${hero('Offers &amp; deals', 'Fresh savings, every day', 'Coupon codes, a daily flash sale and the biggest discounts across the store, all in one place.')}
      <section class="pg-sec" id="coupons">${SectionHeading({ eyebrow: 'Coupon codes', title: 'Save more at checkout', subtitle: 'Copy a code, or apply it straight to your cart. One coupon per order.' })}<div class="coupon-grid">${coupons}</div><p class="pg-msg" id="coupon-msg" role="status" aria-live="polite"></p></section>
      <section class="pg-sec"><div class="flash"><div class="flash-head"><div><span class="eyebrow">Limited time</span><h2>Flash Sale</h2><p>Deals refresh every midnight.</p></div>
        <div class="countdown" role="timer" aria-label="Time left in flash sale"><div><b id="of-h">00</b><small>Hours</small></div><div><b id="of-m">00</b><small>Mins</small></div><div><b id="of-s">00</b><small>Secs</small></div></div></div>
        <div class="product-grid" id="flash-offers">${FM.sets.flash.map(byId).filter(Boolean).map((p) => FM_APP.cards([p])).join('')}</div></div></section>
      <section class="pg-sec">${SectionHeading({ eyebrow: 'Top discounts', title: 'Biggest savings right now' })}
        <div class="chip-row" role="group" aria-label="Filter by discount">${TIERS.map(([t, l], i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-pg="tier" data-t="${t}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
        <div class="product-grid" id="deal-grid"></div><p class="deal-more" id="deal-more"></p></section>
      <section class="pg-sec">${SectionHeading({ eyebrow: 'By category', title: 'Find deals in your aisle' })}<div class="deal-cats">${cats}</div></section>
      <p class="fine">Offers are valid while stock lasts. Discounts and prices shown are sample values for this demo.</p>`;
  }
  function renderDeals(t) {
    const l = deals(t), g = $('#deal-grid'); if (!g) return;
    g.innerHTML = l.length ? FM_APP.cards(l.slice(0, 12)) : `<div class="empty-state" style="grid-column:1/-1">${icon('tag', 'w-10 h-10')}<h3>No deals in this range</h3><p>Try a lower discount.</p></div>`;
    $('#deal-more').innerHTML = l.length > 12 ? `Showing 12 of ${l.length} products. <a class="ci-link" href="${dealsLink(t)}">See all ${l.length} in the shop</a>` : (l.length ? `${l.length} product${l.length > 1 ? 's' : ''} · <a class="ci-link" href="${dealsLink(t)}">Open in shop</a>` : '');
    icons();
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((ok, no) => { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const r = document.execCommand && document.execCommand('copy'); t.remove(); r ? ok() : no(); });
  }
  function countdown() {
    const p = (v) => String(v).padStart(2, '0'), tick = () => {
      const n = new Date(), e = new Date(n); e.setHours(24, 0, 0, 0); const s = Math.max(0, Math.floor((e - n) / 1000));
      $('#of-h').textContent = p(Math.floor(s / 3600)); $('#of-m').textContent = p(Math.floor(s % 3600 / 60)); $('#of-s').textContent = p(s % 60);
    };
    tick(); setInterval(tick, 1000);
  }

  /* =================== ABOUT =================== */
  function about() {
    const stat = (n, l) => `<div class="stat panel"><b>${n}</b><small>${l}</small></div>`;
    const card = (ic, t, x) => `<article class="panel val"><span class="stat-ico">${icon(ic, 'w-5 h-5')}</span><h3>${t}</h3><p>${x}</p></article>`;
    const step = (n, t, x) => `<li><span class="step-n">${n}</span><div><h3>${t}</h3><p>${x}</p></div></li>`;
    return `${hero('About FRESHMART', 'Groceries that taste just picked', 'We bring seasonal produce, daily dairy and pantry staples from trusted growers to your kitchen, quickly and carefully.')}
      <section class="pg-sec about-grid"><div>${SectionHeading({ eyebrow: 'Our story', title: 'Better groceries, without the hassle' })}
        <p class="prose">FRESHMART began with a simple idea: the weekly shop should be easy, fairly priced and fresh. We work with growers and trusted brands, pack every order with care, and deliver it when it suits you, in as little as 60 minutes.</p>
        <p class="prose">From fruit and vegetables to dals, dairy, snacks and household essentials, everything is in one place, with clear prices and no surprises at checkout.</p>
        <div class="co-actions"><a class="btn btn-primary" href="${shop('cat=all')}">Start shopping</a><a class="btn btn-outline" href="${href('contact.html')}">Get in touch</a></div></div>
        <div class="about-art" aria-hidden="true"><span>🥑</span><span>🥖</span><span>🍓</span><span>🥛</span><span>🥕</span><span>🍊</span></div></section>
      <section class="pg-sec"><div class="stat-grid">${stat(FM.products.length + '+', 'Products in store')}${stat(FM.categories.length, 'Categories')}${stat('60 min', 'Express delivery')}${stat(FM.cities.length, 'Cities served')}</div></section>
      <section class="pg-sec">${SectionHeading({ eyebrow: 'What we stand for', title: 'Our promise to you' })}<div class="val-grid">
        ${card('leaf', 'Freshness first', 'Produce and dairy are sourced for quality and delivered quickly, so you get the best of what is in season.')}
        ${card('badge-indian-rupee', 'Fair, clear prices', 'Honest prices with discounts shown up front. Free delivery above ' + rupee(FM.freeDeliveryMin) + '.')}
        ${card('package-check', 'Careful packing', 'Every order is packed so that delicate items arrive in good shape.')}
        ${card('headset', 'Real support', 'Questions about an order? Our team is a message away, and the FAQ covers the common ones.')}</div></section>
      <section class="pg-sec">${SectionHeading({ eyebrow: 'How it works', title: 'From shelf to doorstep in four steps' })}<ol class="steps">
        ${step(1, 'Browse', 'Search or shop by category and add your favourites to the cart.')}${step(2, 'Check out', 'Choose an address, a delivery slot and a payment method.')}
        ${step(3, 'We pack', 'Your order is picked, checked and packed fresh.')}${step(4, 'Delivered', 'Express in 60 minutes, or at the time you picked.')}</ol></section>
      <section class="pg-sec"><div class="band band-news"><div><span class="eyebrow">Where we deliver</span><h2>Serving ${FM.cities.length} cities</h2><p>${FM.cities.map(esc).join(' · ')}</p></div><a class="btn btn-primary btn-lg" href="${shop('cat=all')}">Shop now</a></div></section>`;
  }

  /* =================== CONTACT =================== */
  const TOPICS = ['Order status', 'Delivery issue', 'Payment or refund', 'Product quality', 'My account', 'Feedback', 'Something else'];
  const CV = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
    phone: (v) => (!v.trim() || /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number.'),
    topic: (v) => (v ? '' : 'Choose a topic.'),
    order: (v) => (!v.trim() || /^FM\d{10}$/i.test(v.trim()) ? '' : 'Order numbers look like FM2610051234.'),
    message: (v) => (v.trim().length < 10 ? 'Tell us a little more (at least 10 characters).' : v.length > 1000 ? 'Please keep it under 1000 characters.' : '')
  };
  const field = (id, label, o = {}) => `<div class="fld ${o.cls || ''}"><label for="${id}">${label}</label>${o.select ? `<select id="${id}" aria-describedby="${id}-err"><option value="">Select a topic</option>${o.select.map((x) => `<option>${esc(x)}</option>`).join('')}</select>`
    : o.area ? `<textarea id="${id}" rows="5" maxlength="1000" aria-describedby="${id}-err ${id}-n"></textarea><small class="muted-s" id="${id}-n">0 / 1000</small>`
    : `<input id="${id}" type="${o.type || 'text'}" ${o.attrs || ''} value="${esc(o.value || '')}" aria-describedby="${id}-err">`}<small class="err" id="${id}-err" role="alert"></small></div>`;
  function contact() {
    const me = (window.FM_AUTH && FM_AUTH.user()) || {}, info = (ic, t, x) => `<div class="info panel"><span class="stat-ico">${icon(ic, 'w-5 h-5')}</span><div><h3>${t}</h3>${x}</div></div>`;
    return `${hero('Contact us', 'We’re happy to help', 'Questions about an order, delivery or your account? Send us a message and we’ll get back to you.')}
      <div class="contact-grid"><div class="contact-info">
        ${info('mail', 'Email', `<a href="mailto:${SITE.email}">${SITE.email}</a>`)}${info('phone', 'Phone', `<a href="tel:${SITE.tel}">${SITE.phone}</a>`)}
        ${info('clock', 'Hours', `<p>${SITE.hours}</p>`)}${info('map-pin', 'Address', `<p>${esc(SITE.address)}</p>`)}
        <p class="muted-s">Looking for a quick answer? Try the <a class="ci-link" href="${href('faq.html')}">FAQ</a>.</p></div>
        <section class="panel contact-card" id="contact-card" aria-live="polite"><h2>Send us a message</h2>
          <form id="contact-form" novalidate><p class="hp" aria-hidden="true"><label>Website <input name="website" tabindex="-1" autocomplete="off"></label></p>
            <div class="fld-grid">${field('c-name', 'Your name', { value: me.name, attrs: 'autocomplete="name"' })}${field('c-email', 'Email address', { type: 'email', value: me.email, attrs: 'autocomplete="email" inputmode="email"' })}
            ${field('c-phone', 'Mobile <span class="opt-l">(optional)</span>', { value: me.phone, attrs: 'inputmode="numeric" maxlength="10" autocomplete="tel-national"' })}${field('c-topic', 'Topic', { select: TOPICS })}
            ${field('c-order', 'Order number <span class="opt-l">(optional)</span>', { cls: 'span2', attrs: 'placeholder="e.g. FM2610051234" maxlength="12"' })}${field('c-message', 'Your message', { cls: 'span2', area: true })}</div>
            <button class="btn btn-primary btn-lg" type="submit" id="c-submit">Send message</button></form></section></div>`;
  }
  function validateContact() {
    const rules = [['c-name', CV.name], ['c-email', CV.email], ['c-phone', CV.phone], ['c-topic', CV.topic], ['c-order', CV.order], ['c-message', CV.message]]; let first = null;
    rules.forEach(([id, fn]) => { const el = $('#' + id), m = fn(el.value); el.setAttribute('aria-invalid', m ? 'true' : 'false'); $('#' + id + '-err').textContent = m; if (m && !first) first = el; });
    first && first.focus(); return !first;
  }
  function saveMessage(d) {
    const rec = { id: 'MSG' + Date.now().toString(36).toUpperCase(), at: new Date().toISOString(), name: d.name.trim(), email: d.email.trim().toLowerCase(), phone: d.phone.replace(/[\s-]/g, ''), topic: d.topic, order: d.order.trim().toUpperCase(), message: d.message.trim() };
    ls.set('fm_messages', [rec, ...ls.get('fm_messages', [])].slice(0, 20)); return rec;
  }
  function submitContact(e) {
    e.preventDefault(); if (!validateContact()) return;
    const v = (id) => $('#' + id).value, spam = e.target.elements.website && e.target.elements.website.value;
    const rec = spam ? { id: 'MSG' + Date.now().toString(36).toUpperCase() } : saveMessage({ name: v('c-name'), email: v('c-email'), phone: v('c-phone'), topic: v('c-topic'), order: v('c-order'), message: v('c-message') });
    $('#contact-card').innerHTML = `<div class="sent">${icon('check-circle-2', 'w-10 h-10')}<h2>Message sent</h2><p>Thank you. Your reference is <b>${rec.id}</b>. We’ll reply by email, usually within one working day.</p><p class="muted-s">This demo stores your message on this device only.</p><div class="co-actions"><button class="btn btn-outline" data-pg="again">Send another message</button><a class="btn btn-primary" href="${shop('cat=all')}">Continue shopping</a></div></div>`;
    icons(); $('#contact-card').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); Toast.show('Message sent');
  }

  /* =================== FAQ =================== */
  const GROUPS = [['orders', 'Orders & delivery'], ['payments', 'Payments & coupons'], ['returns', 'Returns & refunds'], ['account', 'Account']];
  const faqData = () => [
    { g: 'orders', q: 'How fast is delivery?', a: 'Choose <b>Express</b> at checkout for delivery within 60 minutes, or pick a scheduled slot for today, tomorrow or the day after.' },
    { g: 'orders', q: 'How much does delivery cost?', a: `Delivery is free on orders above ${rupee(FM.freeDeliveryMin)}. Below that there is a ${rupee(FEE)} delivery fee. The <b>FREESHIP</b> coupon removes the fee on orders above ${rupee(FM_CART.COUPONS.FREESHIP ? FM_CART.COUPONS.FREESHIP.min : 199)}.` },
    { g: 'orders', q: 'Which cities do you deliver to?', a: `We currently deliver in ${FM.cities.map(esc).join(', ')}. You can change your city from the “Deliver to” menu at the top of the page.` },
    { g: 'orders', q: 'How do I track my order?', a: `Sign in and open <a href="${href('dashboard.html#orders')}">My account → My orders</a>. Express orders show their progress from confirmed to delivered.` },
    { g: 'orders', q: 'Can I cancel an order?', a: 'Yes, while your order is still in the first stage (Confirmed). Open <b>My orders</b> and choose <b>Cancel order</b>. Once it is packed it can no longer be cancelled.' },
    { g: 'payments', q: 'Which payment methods can I use?', a: 'UPI, credit and debit cards, net banking and cash on delivery.' },
    { g: 'payments', q: 'Is cash on delivery available?', a: `Yes, for orders up to ${rupee(COD_LIMIT)}. For larger orders please pay online.` },
    { g: 'payments', q: 'Are my card details stored?', a: 'No. Card details are checked in your browser while you pay and are not stored by FRESHMART.' },
    { g: 'payments', q: 'How do I use a coupon?', a: `Enter the code in your cart or at checkout. Available codes: ${Object.keys(FM_CART.COUPONS).map((c) => `<b>${c}</b>`).join(', ')}. See the details on the <a href="${href('offers.html')}">Offers page</a>. One coupon can be used per order.` },
    { g: 'payments', q: 'My payment failed. What now?', a: 'You will see a message at checkout and can try again or choose a different payment method. Your order is only placed once payment succeeds.' },
    /* SAMPLE policy text: edit to match your real returns policy */
    { g: 'returns', q: 'What if an item is damaged or missing?', a: `Please <a href="${href('contact.html')}">contact us</a> within 24 hours of delivery with your order number and, if you can, a photo. We’ll replace the item or refund it.` },
    { g: 'returns', q: 'Can I return fresh products?', a: 'Fresh produce, dairy and bakery items can’t be returned once delivered, but if the quality isn’t right we’ll make it right. Just get in touch.' },
    { g: 'returns', q: 'How long do refunds take?', a: 'Approved refunds go back to your original payment method, usually within 3 to 5 working days.' },
    { g: 'account', q: 'Do I need an account to order?', a: `No, you can check out as a guest. An account lets you track orders, reorder in one tap and save addresses. <a href="${href('register.html')}">Create one</a> in a minute.` },
    { g: 'account', q: 'I forgot my password.', a: `Go to <a href="${href('login.html')}">Sign in</a> and choose <b>Forgot password</b>.` },
    { g: 'account', q: 'How do I change my address or details?', a: `Open <a href="${href('dashboard.html#addresses')}">My account → Addresses</a> to manage delivery addresses, or <b>Profile &amp; security</b> to update your name, phone and password.` },
    { g: 'account', q: 'How do I delete my account?', a: 'Go to <b>My account → Profile &amp; security</b> and choose <b>Delete account</b>. You’ll be asked to confirm with your password.' }
  ];
  const plain = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  function faqFilter(items, cat, q) {
    const t = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => (cat === 'all' || i.g === cat) && t.every((w) => (i.q + ' ' + plain(i.a)).toLowerCase().includes(w)));
  }
  const FS = { cat: 'all', q: '' };
  function faq() {
    return `${hero('Help centre', 'Frequently asked questions', 'Quick answers about delivery, payments, returns and your account.')}
      <section class="pg-sec faq-wrap"><form class="faq-search" role="search" onsubmit="return false">${icon('search', 'w-5 h-5 text-muted')}<input id="faq-q" type="search" placeholder="Search the FAQ…" aria-label="Search frequently asked questions" autocomplete="off"></form>
        <div class="chip-row" id="faq-chips" role="group" aria-label="Filter by topic">${[['all', 'All']].concat(GROUPS).map(([id, l]) => `<button type="button" class="chip" data-pg="faq-cat" data-c="${id}" aria-pressed="false">${l}</button>`).join('')}</div>
        <p class="muted-s" id="faq-count" role="status" aria-live="polite"></p><div id="faq-list"></div>
        <div class="panel still"><div><h3>Still need help?</h3><p>Our team is happy to look into it.</p></div><a class="btn btn-primary" href="${href('contact.html')}">Contact us</a></div></section>`;
  }
  function renderFaq() {
    const all = faqData(), list = faqFilter(all, FS.cat, FS.q);
    $$('#faq-chips .chip').forEach((b) => { const on = b.dataset.c === FS.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $('#faq-count').textContent = FS.q || FS.cat !== 'all' ? `${list.length} answer${list.length === 1 ? '' : 's'} found` : '';
    $('#faq-list').innerHTML = list.length ? GROUPS.map(([id, label]) => { const g = list.filter((i) => i.g === id); return g.length ? `<h2 class="faq-h" id="${id}">${label}</h2>${g.map((i) => `<details class="faq-item"><summary>${i.q}</summary><div class="faq-a">${i.a}</div></details>`).join('')}` : ''; }).join('')
      : `<div class="empty-state">${icon('search-x', 'w-10 h-10')}<h3>No answers found</h3><p>Try different words, or <a class="ci-link" href="${href('contact.html')}">ask us directly</a>.</p></div>`;
    icons();
  }
  const fromHash = () => { const h = location.hash.slice(1); FS.cat = GROUPS.some((g) => g[0] === h) ? h : 'all'; };
  function faqSchema() {
    const s = document.createElement('script'); s.type = 'application/ld+json';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqData().map((i) => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: plain(i.a) } })) });
    document.head.appendChild(s);
  }

  /* =================== wiring =================== */
  const VIEWS = { offers, about, contact, faq };
  function onClick(e) {
    const el = e.target.closest('[data-pg]'); if (!el) return; const a = el.dataset.pg;
    if (a === 'copy') copyText(el.dataset.code).then(() => Toast.show(`${el.dataset.code} copied`), () => Toast.show(`Your code is ${el.dataset.code}`, 'info'));
    else if (a === 'apply') { const r = FM_CART.applyCoupon(el.dataset.code), m = $('#coupon-msg'); m.textContent = r.ok ? `${el.dataset.code} applied to your cart.` : r.msg; m.classList.toggle('bad', !r.ok); Toast.show(r.msg, r.ok ? 'success' : 'info'); }
    else if (a === 'tier') { $$('[data-pg="tier"]').forEach((b) => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); renderDeals(+el.dataset.t); }
    else if (a === 'faq-cat') { FS.cat = el.dataset.c; history.replaceState(null, '', FS.cat === 'all' ? location.pathname + location.search : '#' + FS.cat); renderFaq(); }
    else if (a === 'again') { document.querySelector('#page-root').innerHTML = contact(); icons(); wireContact(); }
  }
  function wireContact() {
    const m = $('#c-message'); m && m.addEventListener('input', () => { $('#c-message-n').textContent = `${m.value.length} / 1000`; });
  }
  function init() {
    const el = $('#page-root'); if (!el) return; const view = VIEWS[el.dataset.page]; if (!view) return;
    el.innerHTML = view(); el.addEventListener('click', onClick); el.addEventListener('submit', (e) => { if (e.target.id === 'contact-form') submitContact(e); });
    el.addEventListener('focusout', (e) => { const t = e.target, r = t.id && t.closest('#contact-form') && CV[({ 'c-name': 'name', 'c-email': 'email', 'c-phone': 'phone', 'c-topic': 'topic', 'c-order': 'order', 'c-message': 'message' })[t.id]]; if (r && t.value !== '') { const m = r(t.value); t.setAttribute('aria-invalid', m ? 'true' : 'false'); $('#' + t.id + '-err').textContent = m; } });
    if (el.dataset.page === 'offers') { renderDeals(0); countdown(); }
    if (el.dataset.page === 'contact') wireContact();
    if (el.dataset.page === 'faq') { fromHash(); renderFaq(); faqSchema(); $('#faq-q').addEventListener('input', (e) => { FS.q = e.target.value; renderFaq(); }); window.addEventListener('hashchange', () => { fromHash(); renderFaq(); }); }
    icons();
  }
  window.FM_PAGES = { init, _t: { faqFilter, faqData, CV, saveMessage, deals, maxOff } };
})();
