/* FRESHMART — Part 08: checkout + payment UI (demo).
   Three steps — Address → Delivery → Payment — on one page, with order summary, validation and a simulated payment.
   Card details are validated in the browser only: they are never stored or sent anywhere. Orders are saved to localStorage (fm_orders). */
(function () {
  const U = window.FM_UI || {}, { Toast, rupee, icon } = U;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => document.body.dataset.root || '';
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const COD_LIMIT = 5000;
  const me = () => (window.FM_AUTH && FM_AUTH.user()) || {};
  const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
  const CITY_STATE = { Lucknow: 'Uttar Pradesh', Delhi: 'Delhi', Mumbai: 'Maharashtra', Bengaluru: 'Karnataka', Hyderabad: 'Telangana', Kolkata: 'West Bengal' };
  const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank'];
  const WINDOWS = [[8, '8 – 10 AM'], [10, '10 AM – 12 PM'], [12, '12 – 2 PM'], [16, '4 – 6 PM'], [18, '6 – 8 PM']];

  /* ---------- validators (pure) ---------- */
  const V = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter the full name.'),
    phone: (v) => (/^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number.'),
    pin: (v) => (/^[1-9]\d{5}$/.test(v.trim()) ? '' : 'Enter a valid 6-digit pincode.'),
    req: (label) => (v) => (v.trim().length >= 3 ? '' : `Enter ${label}.`),
    state: (v) => (v ? '' : 'Select a state.'),
    upi: (v) => (/^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(v.trim()) ? '' : 'Enter a valid UPI ID, like name@okhdfcbank.'),
    luhn(num) { const d = num.replace(/\D/g, ''); if (d.length < 13) return false; let s = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } s += n; } return s % 10 === 0; },
    brand(num) { const d = num.replace(/\D/g, ''); if (/^3[47]/.test(d)) return 'Amex'; if (/^4/.test(d)) return 'Visa'; if (/^(5[1-5]|2[2-7])/.test(d)) return 'Mastercard'; if (/^(60|65|81|82|508)/.test(d)) return 'RuPay'; return ''; },
    card(v) { const d = v.replace(/\D/g, ''), amex = V.brand(d) === 'Amex'; if (d.length !== (amex ? 15 : 16)) return 'Enter the full card number.'; return V.luhn(d) ? '' : 'This card number doesn’t look right.'; },
    expiry(v, now = new Date()) { const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v.trim()); if (!m) return 'Use MM/YY.'; const mo = +m[1], yr = 2000 + +m[2]; if (mo < 1 || mo > 12) return 'Enter a valid month.'; if (yr < now.getFullYear() || (yr === now.getFullYear() && mo < now.getMonth() + 1)) return 'This card has expired.'; return ''; },
    cvv: (v, brand) => (new RegExp(`^\\d{${brand === 'Amex' ? 4 : 3}}$`).test(v.trim()) ? '' : `Enter the ${brand === 'Amex' ? 4 : 3}-digit CVV.`)
  };

  /* ---------- state ---------- */
  const S = { step: 1, done: { 1: false, 2: false, 3: false }, addrs: ls.get('fm_addresses', []), addrId: ls.get('fm_addr_sel', null), editing: null,
    mode: 'express', day: 0, win: '', method: 'upi', bank: '', paying: false, error: '' };
  if (!S.addrs.find((a) => a.id === S.addrId)) S.addrId = S.addrs[0] ? S.addrs[0].id : null;
  if (!S.addrs.length) S.editing = 'new';
  const addr = () => S.addrs.find((a) => a.id === S.addrId);
  const saveAddrs = () => { ls.set('fm_addresses', S.addrs); ls.set('fm_addr_sel', S.addrId); };
  const T = () => FM_CART.totals();
  const days = () => [0, 1, 2].map((i) => { const d = new Date(); d.setDate(d.getDate() + i); return { i, label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) }; });
  const windows = (i) => WINDOWS.filter(([h]) => i > 0 || h >= new Date().getHours() + 2);
  const slotText = () => (S.mode === 'express' ? 'Express · within 60 minutes' : `${days()[S.day].label}, ${days()[S.day].date} · ${S.win}`);
  const payText = () => ({ upi: 'UPI', card: 'Credit / Debit card', netbanking: S.bank ? `Net banking · ${S.bank}` : 'Net banking', cod: 'Cash on delivery' })[S.method];

  /* ---------- markup ---------- */
  const field = (id, label, o = {}) => `<div class="fld ${o.cls || ''}"><label for="${id}">${label}</label>${o.select ? `<select id="${id}" ${o.attrs || ''}><option value="">Select</option>${o.select.map((x) => `<option ${o.value === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`
    : `<input id="${id}" ${o.attrs || ''} value="${esc(o.value || '')}" aria-describedby="${id}-err">`}<small class="err" id="${id}-err" role="alert"></small></div>`;
  const head = (n, title, summary) => `<header class="co-head"><span class="co-num">${S.done[n] && S.step !== n ? icon('check', 'w-4 h-4') : n}</span><div><h2 id="co-h${n}">${title}</h2>${S.step !== n && S.done[n] ? `<p class="co-sum">${summary}</p>` : ''}</div>${S.step !== n && S.done[n] ? `<button type="button" class="ci-link" data-co="goto" data-n="${n}">Change</button>` : ''}</header>`;

  function addressBody() {
    const a0 = S.editing && S.editing !== 'new' ? S.addrs.find((a) => a.id === S.editing) : null, city = ls.get('fm_city', 'Lucknow');
    const list = S.addrs.map((a) => `<label class="opt ${a.id === S.addrId ? 'on' : ''}"><input type="radio" name="addr" value="${a.id}" ${a.id === S.addrId ? 'checked' : ''}>
      <span class="opt-main"><b>${esc(a.name)} <em class="tag-s">${esc(a.type)}</em></b><span>${esc(a.line)}, ${esc(a.area)}</span><span>${esc(a.city)}, ${esc(a.state)} – ${esc(a.pin)}</span><span class="muted-s">Mobile: ${esc(a.phone)}</span></span>
      <span class="opt-act"><button type="button" class="ci-link" data-co="edit" data-id="${a.id}">Edit</button><button type="button" class="ci-link" data-co="del" data-id="${a.id}">Delete</button></span></label>`).join('');
    const form = S.editing ? `<form id="addr-form" class="addr-form" novalidate><h3>${a0 ? 'Edit address' : 'Add a delivery address'}</h3><div class="fld-grid">
      ${field('a-name', 'Full name', { value: a0 ? a0.name : me().name, attrs: 'autocomplete="name"' })}${field('a-phone', 'Mobile number', { value: a0 ? a0.phone : me().phone, attrs: 'inputmode="numeric" maxlength="10" autocomplete="tel-national"' })}
      ${field('a-pin', 'Pincode', { value: a0 && a0.pin, attrs: 'inputmode="numeric" maxlength="6" autocomplete="postal-code"' })}${field('a-city', 'City', { value: a0 ? a0.city : city, attrs: 'autocomplete="address-level2"' })}
      ${field('a-state', 'State', { select: STATES, value: a0 ? a0.state : CITY_STATE[city] || '', attrs: 'autocomplete="address-level1"' })}
      ${field('a-line', 'Flat / House no. / Building', { value: a0 && a0.line, cls: 'span2', attrs: 'autocomplete="address-line1"' })}${field('a-area', 'Area / Street / Landmark', { value: a0 && a0.area, cls: 'span2', attrs: 'autocomplete="address-line2"' })}</div>
      <fieldset class="types"><legend>Save as</legend>${['Home', 'Work', 'Other'].map((t, i) => `<label class="chip-r"><input type="radio" name="a-type" value="${t}" ${(a0 ? a0.type === t : i === 0) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>
      <div class="co-actions"><button class="btn btn-primary" type="submit">Save address</button>${S.addrs.length ? '<button type="button" class="btn btn-ghost" data-co="cancel-addr">Cancel</button>' : ''}</div></form>` : '';
    return `<div class="opt-list" role="radiogroup" aria-label="Saved addresses">${list}</div>${!S.editing ? `<button type="button" class="add-new" data-co="new-addr">${icon('plus', 'w-4 h-4')}Add a new address</button><div class="co-actions"><button type="button" class="btn btn-primary" data-co="next" data-n="1" ${S.addrId ? '' : 'disabled'}>Deliver to this address</button></div>` : ''}${form}`;
  }
  function deliveryBody() {
    const ds = days(), ws = windows(S.day), t = T();
    const mode = (v, ic, title, sub) => `<label class="opt ${S.mode === v ? 'on' : ''}"><input type="radio" name="mode" value="${v}" ${S.mode === v ? 'checked' : ''}>${icon(ic, 'w-5 h-5')}<span class="opt-main"><b>${title}</b><span>${sub}</span></span><b class="opt-price">${t.delivery ? rupee(t.delivery) : 'Free'}</b></label>`;
    const sched = S.mode === 'scheduled' ? `<div class="sched"><div class="presets" role="radiogroup" aria-label="Delivery day">${ds.map((d) => `<button type="button" class="chip-sm ${S.day === d.i ? 'on' : ''}" role="radio" aria-checked="${S.day === d.i}" data-co="day" data-i="${d.i}">${d.label} · ${d.date}</button>`).join('')}</div>
      <div class="presets" role="radiogroup" aria-label="Time window">${ws.length ? ws.map(([, w]) => `<button type="button" class="chip-sm ${S.win === w ? 'on' : ''}" role="radio" aria-checked="${S.win === w}" data-co="win" data-w="${w}">${w}</button>`).join('') : '<span class="muted-s">No more slots today — pick another day.</span>'}</div>
      <small class="err" id="slot-err" role="alert"></small></div>` : '';
    return `<div class="opt-list">${mode('express', 'zap', 'Express delivery', 'At your door in about 60 minutes')}${mode('scheduled', 'calendar-clock', 'Schedule for later', 'Choose a day and a 2-hour window')}</div>${sched}<div class="co-actions"><button type="button" class="btn btn-primary" data-co="next" data-n="2">Continue to payment</button></div>`;
  }
  function paymentBody() {
    const t = T(), codOk = t.total <= COD_LIMIT;
    const m = (v, ic, title, sub, panel, disabled) => `<div class="pm ${S.method === v ? 'on' : ''} ${disabled ? 'off' : ''}"><label class="pm-row"><input type="radio" name="pay" value="${v}" ${S.method === v ? 'checked' : ''} ${disabled ? 'disabled' : ''}>${icon(ic, 'w-5 h-5')}<span class="opt-main"><b>${title}</b><span>${sub}</span></span></label>${S.method === v ? `<div class="pm-panel">${panel}</div>` : ''}</div>`;
    const upi = `<div class="fld-grid">${field('upi-id', 'UPI ID', { attrs: 'autocomplete="off" placeholder="name@okhdfcbank" autocapitalize="off" spellcheck="false"', cls: 'span2' })}</div><p class="muted-s">You’ll get a payment request in your UPI app. Approve it within 5 minutes.</p>`;
    const card = `<div class="fld-grid">${field('c-num', 'Card number', { attrs: 'inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" maxlength="19"', cls: 'span2' })}${field('c-name', 'Name on card', { attrs: 'autocomplete="cc-name"', cls: 'span2' })}
      ${field('c-exp', 'Expiry (MM/YY)', { attrs: 'inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"' })}${field('c-cvv', 'CVV', { attrs: 'inputmode="numeric" autocomplete="cc-csc" type="password" maxlength="4" placeholder="•••"' })}</div>
      <p class="muted-s">${icon('lock', 'w-3.5 h-3.5')} Demo mode: card details are checked in your browser only and are never stored or sent.</p>`;
    const nb = `<div class="bank-grid" role="radiogroup" aria-label="Choose your bank">${BANKS.map((b) => `<label class="chip-r"><input type="radio" name="bank" value="${esc(b)}" ${S.bank === b ? 'checked' : ''}><span>${esc(b)}</span></label>`).join('')}</div><small class="err" id="bank-err" role="alert"></small>`;
    const cod = `<p>Pay <b>${rupee(t.total)}</b> in cash or UPI when your order arrives. Please keep the exact amount ready.</p>`;
    return `${S.error ? `<div class="pay-error" role="alert">${icon('circle-alert', 'w-5 h-5')}<span>${esc(S.error)}</span></div>` : ''}<div class="pm-list">${m('upi', 'smartphone', 'UPI', 'Google Pay, PhonePe, Paytm, BHIM', upi)}${m('card', 'credit-card', 'Credit / Debit card', 'Visa, Mastercard, RuPay, Amex', card)}${m('netbanking', 'landmark', 'Net banking', 'All major Indian banks', nb)}${m('cod', 'banknote', 'Cash on delivery', codOk ? 'Pay when you receive your order' : `Not available above ${rupee(COD_LIMIT)}`, cod, !codOk)}</div>
      <div class="co-actions"><button type="button" class="btn btn-primary btn-lg" data-co="place" id="place-btn">${S.method === 'cod' ? 'Place order' : `Pay ${rupee(t.total)}`}</button></div><p class="muted-s">By placing this order you agree to FRESHMART’s terms of sale and returns policy.</p>`;
  }
  function summaryHtml() {
    const t = T(), row = (l, v, c = '') => `<div class="sum-row ${c}"><span>${l}</span><b>${v}</b></div>`, shown = t.items.slice(0, 4);
    const box = t.code ? `<div class="coupon-on">${icon('ticket-percent', 'w-4 h-4')}<span><b>${t.code}</b> applied</span><button type="button" class="ci-link" data-co="coupon-rm">Remove</button></div>${t.couponNote ? `<p class="coupon-msg err">${esc(t.couponNote)}</p>` : ''}`
      : `<form id="co-coupon" class="coupon" novalidate><label for="co-coupon-in">Have a coupon?</label><div class="coupon-field"><input id="co-coupon-in" placeholder="Enter code" autocomplete="off" autocapitalize="characters"><button class="btn btn-outline btn-sm" type="submit">Apply</button></div><p class="coupon-msg err" id="co-coupon-msg" aria-live="polite"></p></form>`;
    return `<h2>Order summary</h2><ul class="mini-items">${shown.map(({ p, q }) => `<li><span class="ci-thumb mini" style="--tint:${(FM.categories.find((c) => c.id === p.category) || {}).tint}"><img src="${root()}${p.image}" alt="" onerror="this.remove()"><span>${p.emoji}</span></span><span class="mi-name">${esc(p.name)}<small>Qty ${q}</small></span><b>${rupee(p.price * q)}</b></li>`).join('')}</ul>${t.items.length > 4 ? `<p class="muted-s">+ ${t.items.length - 4} more item${t.items.length - 4 === 1 ? '' : 's'}</p>` : ''}
      ${box}${row(`Items (${t.count})`, rupee(t.mrp))}${t.savings ? row('Product discount', '− ' + rupee(t.savings), 'good') : ''}${t.discount ? row(`Coupon (${t.code})`, '− ' + rupee(t.discount), 'good') : ''}${row('Delivery', t.delivery ? rupee(t.delivery) : 'Free', t.delivery ? '' : 'good')}${row('Total', rupee(t.total), 'total')}
      ${t.allSaved > 0 ? `<p class="saved">${icon('badge-percent', 'w-4 h-4')}You’re saving ${rupee(t.allSaved)}</p>` : ''}<a class="ci-link" href="${root()}pages/cart.html">${icon('arrow-left', 'w-4 h-4')} Edit cart</a>
      <p class="muted-s">${icon('shield-check', 'w-3.5 h-3.5')} Secure checkout · Easy returns on fresh produce</p>`;
  }
  function render() {
    const a = addr(), steps = [[1, 'Delivery address', a ? `${esc(a.name)}, ${esc(a.line)}, ${esc(a.city)} – ${esc(a.pin)}` : '', addressBody], [2, 'Delivery time', slotText(), deliveryBody], [3, 'Payment', payText(), paymentBody]];
    $('#checkout-root').innerHTML = `<div class="co-layout"><div class="co-main">${steps.map(([n, title, sum, body]) => `<section class="co-card ${S.step === n ? 'open' : ''} ${S.done[n] ? 'done' : ''}" aria-labelledby="co-h${n}">${head(n, title, sum)}${S.step === n ? `<div class="co-body">${body()}</div>` : ''}</section>`).join('')}</div><aside class="summary" id="co-summary" aria-label="Order summary">${summaryHtml()}</aside></div>`;
    window.lucide && lucide.createIcons(); bind();
  }

  /* ---------- behaviour ---------- */
  const setErr = (el, msg) => { const e = $('#' + el.id + '-err'); if (e) e.textContent = msg; el.setAttribute('aria-invalid', String(!!msg)); return !msg; };
  const check = (id, fn, ...rest) => { const el = $('#' + id); return el ? setErr(el, fn(el.value, ...rest)) : true; };
  const firstBad = () => $('[aria-invalid="true"]') || $('.err:not(:empty)');
  function bind() {
    const body = $('.co-card.open .co-body'); if (!body) return;
    $$('input,select', body).forEach((el) => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') setErr(el, ''); }));
    const f = $('#addr-form'); if (f) {
      $('#a-pin').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
      $('#a-phone').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
      $('#a-city').addEventListener('change', (e) => { const s = CITY_STATE[e.target.value.trim()]; if (s && !$('#a-state').value) $('#a-state').value = s; });
      f.addEventListener('submit', saveAddress);
    }
    const num = $('#c-num'); if (num) {
      num.addEventListener('input', () => { const d = num.value.replace(/\D/g, '').slice(0, V.brand(num.value) === 'Amex' ? 15 : 16), amex = V.brand(d) === 'Amex';
        num.value = amex ? [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(' ') : d.replace(/(.{4})(?=.)/g, '$1 '); num.dataset.brand = V.brand(d); });
      $('#c-exp').addEventListener('input', (e) => { let d = e.target.value.replace(/\D/g, '').slice(0, 4); if (d.length >= 3) d = d.slice(0, 2) + '/' + d.slice(2); e.target.value = d; });
      $('#c-cvv').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
    }
    const first = $('input:not([type=radio]):not([type=hidden]),select', body); if (first && S.editing && $('#addr-form')) first.focus();
  }
  function saveAddress(e) {
    e.preventDefault();
    const ok = [check('a-name', V.name), check('a-phone', V.phone), check('a-pin', V.pin), check('a-city', V.req('the city')), check('a-state', V.state), check('a-line', V.req('the house / building')), check('a-area', V.req('the area or street'))].every(Boolean);
    if (!ok) { const b = firstBad(); b && b.focus && b.focus(); return; }
    const g = (id) => $('#' + id).value.trim(), rec = { id: S.editing !== 'new' ? S.editing : 'a' + Date.now(), name: g('a-name'), phone: g('a-phone'), pin: g('a-pin'), city: g('a-city'), state: g('a-state'), line: g('a-line'), area: g('a-area'), type: $('input[name="a-type"]:checked').value };
    const i = S.addrs.findIndex((a) => a.id === rec.id); i > -1 ? (S.addrs[i] = rec) : S.addrs.push(rec);
    S.addrId = rec.id; S.editing = null; saveAddrs(); render(); Toast && Toast.show('Address saved');
  }
  function next(n) {
    if (n === 1 && !addr()) return;
    if (n === 2 && S.mode === 'scheduled' && !S.win) { const e = $('#slot-err'); e.textContent = 'Choose a time window.'; return; }
    S.done[n] = true; S.step = n + 1; render(); $('#co-h' + S.step).scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#co-h' + S.step).setAttribute('tabindex', '-1'); $('#co-h' + S.step).focus({ preventScroll: true });
  }
  function validatePayment() {
    if (S.method === 'upi') return check('upi-id', V.upi);
    if (S.method === 'card') { const b = V.brand($('#c-num').value); return [check('c-num', V.card), check('c-name', V.name), check('c-exp', V.expiry), check('c-cvv', V.cvv, b)].every(Boolean); }
    if (S.method === 'netbanking') { if (!S.bank) { $('#bank-err').textContent = 'Choose your bank.'; return false; } return true; }
    return T().total <= COD_LIMIT;
  }
  const overlay = (msg) => { let o = $('#pay-overlay'); if (!o) { o = document.createElement('div'); o.id = 'pay-overlay'; o.className = 'pay-overlay'; o.setAttribute('role', 'alertdialog'); o.setAttribute('aria-modal', 'true'); document.body.appendChild(o); } o.innerHTML = `<div class="pay-box"><span class="spinner" aria-hidden="true"></span><h3>${msg[0]}</h3><p>${msg[1]}</p></div>`; o.hidden = false; document.body.classList.add('no-scroll'); };
  const MSG = { upi: ['Waiting for UPI approval', 'Open your UPI app and approve the request. Please don’t close this page.'], card: ['Processing your payment', 'Securely contacting your bank…'], netbanking: ['Redirecting to your bank', 'Complete the payment there to confirm your order.'], cod: ['Placing your order', 'Just a moment…'] };
  function place() {
    if (S.paying) return; S.error = '';
    if (!T().count) return (location.href = root() + 'pages/cart.html');
    if (!validatePayment()) { const b = firstBad(); b && b.focus && b.focus(); return; }
    const fail = (S.method === 'card' && $('#c-num').value.replace(/\D/g, '').endsWith('0002')) || (S.method === 'upi' && /^fail@/i.test($('#upi-id').value));   // demo: simulate a declined payment
    S.paying = true; $('#place-btn').disabled = true; overlay(MSG[S.method]);
    setTimeout(() => {
      const o = $('#pay-overlay');
      if (fail) { S.paying = false; S.error = 'Payment failed. Your bank declined the transaction. No money was taken — try again or choose another method.'; o.hidden = true; document.body.classList.remove('no-scroll'); render(); const e = $('.pay-error'); e && e.scrollIntoView({ block: 'center' }); return; }
      location.href = `${root()}pages/order-success.html?id=${createOrder()}`;
    }, S.method === 'cod' ? 900 : 1800);
  }
  function createOrder() {
    const t = T(), a = addr(), d = new Date(), id = 'FM' + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + String(Math.floor(1000 + Math.random() * 9000));
    const order = { id, placed: d.toISOString(), status: 'Confirmed', items: t.items.map(({ p, q }) => ({ id: p.id, name: p.name, weight: p.weight, price: p.price, qty: q, emoji: p.emoji, image: p.image })),
      totals: { mrp: t.mrp, savings: t.savings, coupon: t.code, discount: t.discount, delivery: t.delivery, total: t.total }, uid: me().id || null, address: a, slot: slotText(), payment: payText(), paid: S.method !== 'cod' };
    const all = ls.get('fm_orders', []); ls.set('fm_orders', [order, ...all].slice(0, 20)); FM_CART.clear(); return id;
  }

  function onClick(e) {
    const el = e.target.closest('[data-co]'); if (!el) return; const a = el.dataset.co;
    if (a === 'next') next(+el.dataset.n);
    else if (a === 'goto') { S.step = +el.dataset.n; S.editing = S.step === 1 ? null : S.editing; render(); }
    else if (a === 'new-addr') { S.editing = 'new'; render(); }
    else if (a === 'cancel-addr') { S.editing = null; render(); }
    else if (a === 'edit') { S.editing = el.dataset.id; S.addrId = el.dataset.id; render(); }
    else if (a === 'del') { if (!confirm('Delete this address?')) return; S.addrs = S.addrs.filter((x) => x.id !== el.dataset.id); if (S.addrId === el.dataset.id) S.addrId = S.addrs[0] ? S.addrs[0].id : null; if (!S.addrs.length) { S.editing = 'new'; S.done[1] = false; } saveAddrs(); render(); }
    else if (a === 'day') { S.day = +el.dataset.i; S.win = ''; render(); }
    else if (a === 'win') { S.win = el.dataset.w; render(); }
    else if (a === 'place') place();
    else if (a === 'coupon-rm') { FM_CART.removeCoupon(); refresh(); Toast && Toast.show('Coupon removed', 'info'); }
  }
  /* re-render after a coupon change without losing what the shopper already typed into payment fields */
  function refresh() {
    const ids = ['upi-id', 'c-num', 'c-name', 'c-exp', 'c-cvv'], keep = {}; ids.forEach((id) => { const el = $('#' + id); if (el) keep[id] = el.value; });
    render(); Object.entries(keep).forEach(([id, v]) => { const el = $('#' + id); if (el) el.value = v; });
  }
  function onCoupon(e) {
    if (e.target.id !== 'co-coupon') return; e.preventDefault();
    const r = FM_CART.applyCoupon($('#co-coupon-in').value);
    if (r.ok) { refresh(); Toast && Toast.show(`${r.msg} Savings added to your order.`); } else { const m = $('#co-coupon-msg'); m.textContent = r.msg; $('#co-coupon-in').setAttribute('aria-invalid', 'true'); }
  }
  function onChange(e) {
    const t = e.target;
    if (t.name === 'addr') { S.addrId = t.value; saveAddrs(); render(); }
    else if (t.name === 'mode') { S.mode = t.value; S.win = ''; render(); }
    else if (t.name === 'pay') { S.method = t.value; S.error = ''; render(); }
    else if (t.name === 'bank') { S.bank = t.value; $('#bank-err').textContent = ''; $$('.bank-grid .chip-r').forEach((c) => c.classList.toggle('on', c.contains(t))); }
  }

  /* ---------- order confirmation ---------- */
  function success() {
    const el = $('#success-root'), id = new URLSearchParams(location.search).get('id'), o = ls.get('fm_orders', []).find((x) => x.id === id);
    if (!o) { el.innerHTML = `<div class="empty-state">${icon('package-search', 'w-10 h-10')}<h3>We couldn’t find that order</h3><p>It may have been placed on another device or browser.</p><a class="btn btn-primary" href="${root()}pages/shop.html?cat=all">Continue shopping</a></div>`; return; }
    const t = o.totals, a = o.address, row = (l, v, c = '') => `<div class="sum-row ${c}"><span>${l}</span><b>${v}</b></div>`;
    el.innerHTML = `<div class="ok-hero"><span class="ok-ico">${icon('check', 'w-8 h-8')}</span><h1>Thank you, your order is confirmed</h1><p>Order <b>${o.id}</b> · A confirmation has been saved on this device.</p></div>
      <div class="co-layout"><div class="co-main"><section class="co-card open"><div class="co-body"><div class="ok-grid">
        <div><h3>Delivery</h3><p>${esc(o.slot)}</p></div><div><h3>Address</h3><p>${esc(a.name)} · ${esc(a.phone)}<br>${esc(a.line)}, ${esc(a.area)}<br>${esc(a.city)}, ${esc(a.state)} – ${esc(a.pin)}</p></div>
        <div><h3>Payment</h3><p>${esc(o.payment)}<br><span class="muted-s">${o.paid ? 'Paid' : 'Pay on delivery · ' + rupee(t.total)}</span></p></div></div></div></section>
        <section class="co-card open"><div class="co-body"><h3>Items (${o.items.reduce((s, i) => s + i.qty, 0)})</h3><ul class="ci-list">${o.items.map((i) => `<li class="ci"><span class="ci-thumb" style="--tint:#EEF6E4"><img src="${root()}${i.image}" alt="" onerror="this.remove()"><span>${i.emoji}</span></span><div class="ci-body"><span class="ci-name">${esc(i.name)}</span><small>${esc(i.weight)} · Qty ${i.qty}</small></div><div class="ci-price"><b>${rupee(i.price * i.qty)}</b></div></li>`).join('')}</ul></div></section></div>
      <aside class="summary"><h2>Payment summary</h2>${row('Items', rupee(t.mrp))}${t.savings ? row('Product discount', '− ' + rupee(t.savings), 'good') : ''}${t.discount ? row(`Coupon (${t.coupon})`, '− ' + rupee(t.discount), 'good') : ''}${row('Delivery', t.delivery ? rupee(t.delivery) : 'Free', t.delivery ? '' : 'good')}${row(o.paid ? 'Total paid' : 'Total due', rupee(t.total), 'total')}
        <a class="btn btn-primary w-full" href="${root()}pages/shop.html?cat=all">Continue shopping</a><button type="button" class="btn btn-outline w-full" onclick="window.print()">${icon('printer', 'w-4 h-4')}Print receipt</button></aside></div>`;
    window.lucide && lucide.createIcons();
  }

  function init() {
    if ($('#success-root')) { success(); return; }
    const el = $('#checkout-root'); if (!el) return;
    $('#co-heading').innerHTML = U.SectionHeading({ eyebrow: 'Almost there', title: 'Checkout' });
    if (!T().count) { el.innerHTML = `<div class="empty-state">${icon('shopping-bag', 'w-10 h-10')}<h3>Your cart is empty</h3><p>Add something fresh before you check out.</p><a class="btn btn-primary" href="${root()}pages/shop.html?cat=all">Start shopping</a></div>`; window.lucide && lucide.createIcons(); return; }
    if (addr()) { S.done[1] = false; }
    render(); el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('submit', onCoupon);
  }
  window.FM_CHECKOUT = { init, V, createOrder };
})();
