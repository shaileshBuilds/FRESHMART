/* FRESHMART — Part 09: customer dashboard (demo).
   Tabs (URL hash): Overview · My orders · Addresses · Wishlist · Profile & security.
   Reads the same localStorage data the shop already writes: fm_orders, fm_addresses, fm_wish. */
(function () {
  const U = window.FM_UI || {}, { Toast, rupee, icon } = U, A = window.FM_AUTH;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => document.body.dataset.root || '';
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const icons = () => window.lucide && lucide.createIcons();
  const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
  const TABS = [['overview', 'Overview', 'layout-dashboard'], ['orders', 'My orders', 'package'], ['addresses', 'Addresses', 'map-pin'], ['wishlist', 'Wishlist', 'heart'], ['profile', 'Profile & security', 'user-cog']];
  const V = { name: (v) => (v.trim().length >= 2 ? '' : 'Enter the full name.'), phone: (v) => (/^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number.'),
    pin: (v) => (/^[1-9]\d{5}$/.test(v.trim()) ? '' : 'Enter a valid 6-digit pincode.'), req: (l) => (v) => (v.trim().length >= 3 ? '' : `Enter ${l}.`), state: (v) => (v ? '' : 'Select a state.') };
  let me, tab = 'overview', openOrder = null, editing = null;

  /* ---------- data ---------- */
  const allOrders = () => ls.get('fm_orders', []), mine = () => allOrders().filter((o) => o.uid === me.id), guest = () => allOrders().filter((o) => !o.uid);
  const addrs = () => ls.get('fm_addresses', []), wishIds = () => ls.get('fm_wish', []);
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const STEPS = ['Confirmed', 'Packed', 'Out for delivery', 'Delivered'], isExpress = (o) => /^Express/.test(o.slot || '');
  function stage(o) { if (o.status === 'Cancelled') return -1; if (!isExpress(o)) return 0; const m = (Date.now() - new Date(o.placed)) / 60000; return m < 10 ? 0 : m < 30 ? 1 : m < 60 ? 2 : 3; }   // demo: express orders progress with time
  const statusOf = (o) => (o.status === 'Cancelled' ? 'Cancelled' : isExpress(o) ? STEPS[stage(o)] : 'Scheduled');
  const badge = (o) => { const s = statusOf(o); return `<span class="st st-${s.toLowerCase().replace(/\s+/g, '-')}">${s}</span>`; };
  const qty = (o) => o.items.reduce((s, i) => s + i.qty, 0);
  const thumb = (i) => `<span class="ci-thumb" style="--tint:#EEF6E4" title="${esc(i.name)}"><img src="${root()}${i.image}" alt="" onerror="this.remove()"><span>${i.emoji}</span></span>`;
  const empty = (ic, title, text, cta) => `<div class="empty-state">${icon(ic, 'w-10 h-10')}<h3>${title}</h3><p>${text}</p>${cta || ''}</div>`;
  const shopBtn = `<a class="btn btn-primary" href="${root()}pages/shop.html?cat=all">Start shopping</a>`;

  /* ---------- panes ---------- */
  function orderCard(o) {
    const open = openOrder === o.id, s = stage(o), a = o.address || {};
    const track = o.status === 'Cancelled' ? '<p class="muted-s">This order was cancelled.</p>' : !isExpress(o) ? `<p class="muted-s">Scheduled for ${esc(o.slot)}.</p>`
      : `<ol class="track" aria-label="Order progress">${STEPS.map((x, i) => `<li class="${i <= s ? 'done' : ''}" ${i === s ? 'aria-current="step"' : ''}><span>${i < s ? icon('check', 'w-3 h-3') : i + 1}</span>${x}</li>`).join('')}</ol>`;
    return `<article class="ord panel"><header class="ord-head"><div><b>Order ${esc(o.id)}</b><small>${fmtDate(o.placed)} · ${qty(o)} item${qty(o) > 1 ? 's' : ''}</small></div>${badge(o)}<b class="ord-total">${rupee(o.totals.total)}</b></header>
      <div class="ord-thumbs">${o.items.slice(0, 6).map(thumb).join('')}${o.items.length > 6 ? `<span class="more">+${o.items.length - 6}</span>` : ''}</div>
      <div class="ord-actions"><button class="btn btn-outline btn-sm" data-d="toggle" data-id="${o.id}" aria-expanded="${open}">${open ? 'Hide details' : 'View details'}</button><button class="btn btn-primary btn-sm" data-d="reorder" data-id="${o.id}">${icon('rotate-cw', 'w-4 h-4')}Reorder</button>
        <a class="ci-link" href="${root()}pages/order-success.html?id=${o.id}">Receipt</a>${s === 0 && o.status !== 'Cancelled' ? `<button class="ci-link danger-l" data-d="cancel" data-id="${o.id}">Cancel order</button>` : ''}</div>
      ${open ? `<div class="ord-detail">${track}<ul class="ci-list">${o.items.map((i) => `<li class="ci">${thumb(i)}<div class="ci-body"><span class="ci-name">${esc(i.name)}</span><small>${esc(i.weight)} · Qty ${i.qty}</small></div><div class="ci-price"><b>${rupee(i.price * i.qty)}</b></div></li>`).join('')}</ul>
        <div class="ok-grid"><div><h3>Delivery</h3><p>${esc(o.slot)}</p></div><div><h3>Address</h3><p>${esc(a.name || '')}<br>${esc(a.line || '')}, ${esc(a.area || '')}<br>${esc(a.city || '')} – ${esc(a.pin || '')}</p></div><div><h3>Payment</h3><p>${esc(o.payment)}<br><span class="muted-s">${o.paid ? 'Paid' : 'Pay on delivery'}</span></p></div></div></div>` : ''}</article>`;
  }
  const claim = () => (guest().length ? `<div class="notice">${icon('info', 'w-5 h-5')}<p>${guest().length} earlier order${guest().length > 1 ? 's' : ''} on this device ${guest().length > 1 ? 'aren’t' : 'isn’t'} linked to an account.</p><button class="btn btn-outline btn-sm" data-d="claim">Add to my account</button></div>` : '');

  const PANES = {
    overview() {
      const os = mine(), live = os.filter((o) => o.status !== 'Cancelled'), spent = live.reduce((s, o) => s + o.totals.total, 0);
      const stat = (ic, n, l) => `<div class="stat panel"><span class="stat-ico">${icon(ic, 'w-5 h-5')}</span><b>${n}</b><small>${l}</small></div>`;
      return `<h2 class="pane-title">Overview</h2>${claim()}<div class="stat-grid">${stat('package', os.length, 'Orders placed')}${stat('indian-rupee', rupee(spent), 'Total spent')}${stat('heart', wishIds().length, 'Wishlist items')}${stat('map-pin', addrs().length, 'Saved addresses')}</div>
        <div class="pane-head"><h3>Recent orders</h3>${os.length ? '<a class="ci-link" href="#orders">View all</a>' : ''}</div>
        ${os.length ? os.slice(0, 3).map(orderCard).join('') : empty('shopping-basket', 'No orders yet', 'Your orders will show up here once you check out.', shopBtn)}${window.FM_REC ? FM_REC.dash() : ''}`;
    },
    orders() { const os = mine(); return `<h2 class="pane-title">My orders</h2>${claim()}${os.length ? os.map(orderCard).join('') : empty('package-search', 'No orders yet', 'When you place an order while signed in, you can track and reorder it here.', shopBtn)}`; },
    addresses() {
      const list = addrs(), a0 = editing && editing !== 'new' ? list.find((a) => a.id === editing) : null, f = (id, label, v, o = {}) => `<div class="fld ${o.cls || ''}"><label for="${id}">${label}</label>${o.sel ? `<select id="${id}" aria-describedby="${id}-err"><option value="">Select</option>${STATES.map((x) => `<option ${v === x ? 'selected' : ''}>${x}</option>`).join('')}</select>` : `<input id="${id}" ${o.attrs || ''} value="${esc(v || '')}" aria-describedby="${id}-err">`}<small class="err" id="${id}-err" role="alert"></small></div>`;
      const form = editing ? `<form id="addr-form" class="panel addr-form" novalidate><h3>${a0 ? 'Edit address' : 'Add an address'}</h3><div class="fld-grid">${f('a-name', 'Full name', a0 ? a0.name : me.name, { attrs: 'autocomplete="name"' })}${f('a-phone', 'Mobile number', a0 ? a0.phone : me.phone, { attrs: 'inputmode="numeric" maxlength="10"' })}${f('a-pin', 'Pincode', a0 && a0.pin, { attrs: 'inputmode="numeric" maxlength="6"' })}${f('a-city', 'City', a0 ? a0.city : ls.get('fm_city', 'Lucknow'))}${f('a-state', 'State', a0 && a0.state, { sel: 1 })}${f('a-line', 'Flat / House no. / Building', a0 && a0.line, { cls: 'span2' })}${f('a-area', 'Area / Street / Landmark', a0 && a0.area, { cls: 'span2' })}</div>
        <fieldset class="types"><legend>Save as</legend>${['Home', 'Work', 'Other'].map((t, i) => `<label class="chip-r"><input type="radio" name="a-type" value="${t}" ${(a0 ? a0.type === t : i === 0) ? 'checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>
        <div class="co-actions"><button class="btn btn-primary" type="submit">Save address</button><button type="button" class="btn btn-ghost" data-d="cancel-addr">Cancel</button></div></form>` : '';
      return `<h2 class="pane-title">Addresses</h2><p class="muted-s mb">Saved on this device and used at checkout.</p>${form}${list.length ? `<div class="addr-grid">${list.map((a) => `<article class="panel addr"><b>${esc(a.name)} <em class="tag-s">${esc(a.type)}</em></b><p>${esc(a.line)}, ${esc(a.area)}<br>${esc(a.city)}, ${esc(a.state)} – ${esc(a.pin)}</p><small class="muted-s">Mobile: ${esc(a.phone)}</small><div class="co-actions"><button class="ci-link" data-d="edit-addr" data-id="${a.id}">Edit</button><button class="ci-link danger-l" data-d="del-addr" data-id="${a.id}">Delete</button></div></article>`).join('')}</div>` : (editing ? '' : empty('map-pin', 'No saved addresses', 'Add one now to speed up checkout.'))}${editing ? '' : `<button class="btn btn-primary mt" data-d="new-addr">${icon('plus', 'w-4 h-4')}Add address</button>`}`;
    },
    wishlist() {
      const list = wishIds().map((id) => FM.products.find((p) => p.id === id)).filter(Boolean);
      return `<h2 class="pane-title">Wishlist</h2>${list.length ? `<div class="product-grid dash-grid">${window.FM_APP.cards(list)}</div>` : empty('heart', 'Your wishlist is empty', 'Tap the heart on any product to save it here.', shopBtn)}`;
    },
    profile() {
      const f = (id, label, v, o = {}) => `<div class="fld ${o.cls || ''}"><label for="${id}">${label}</label><input id="${id}" ${o.attrs || ''} value="${esc(v || '')}" aria-describedby="${id}-err"><small class="err" id="${id}-err" role="alert"></small></div>`;
      const pw = (id, label, ac) => `<div class="fld"><label for="${id}">${label}</label><input id="${id}" type="password" autocomplete="${ac}" aria-describedby="${id}-err"><small class="err" id="${id}-err" role="alert"></small></div>`;
      return `<h2 class="pane-title">Profile &amp; security</h2>
        <form id="pf-form" class="panel pane-form" novalidate><h3>Your details</h3><div class="fld-grid">${f('p-name', 'Full name', me.name, { attrs: 'autocomplete="name"' })}${f('p-phone', 'Mobile number', me.phone, { attrs: 'inputmode="numeric" maxlength="10"' })}${f('p-email', 'Email address', me.email, { cls: 'span2', attrs: 'readonly' })}</div><p class="muted-s">Member since ${fmtDate(me.created)}. Your email can’t be changed in this demo.</p><button class="btn btn-primary" type="submit">Save changes</button></form>
        <form id="pw-form" class="panel pane-form" novalidate><h3>Change password</h3><p class="form-error" id="pw-error" role="alert" hidden></p><div class="fld-grid">${pw('w-old', 'Current password', 'current-password').replace('class="fld"', 'class="fld span2"')}${pw('w-new', 'New password', 'new-password')}${pw('w-new2', 'Confirm new password', 'new-password')}</div><button class="btn btn-primary" type="submit">Update password</button></form>
        <form id="del-form" class="panel pane-form danger" novalidate><h3>Delete account</h3><p class="muted-s">This removes your account and the orders linked to it from this device. It can’t be undone.</p><p class="form-error" id="del-error" role="alert" hidden></p>${pw('d-pass', 'Confirm with your password', 'current-password')}<button class="btn btn-danger" type="submit">Delete my account</button></form>`;
    }
  };

  /* ---------- render ---------- */
  function render() {
    const first = me.name.split(' ')[0];
    $('#dash-heading').innerHTML = U.SectionHeading({ eyebrow: 'My account', title: `Hi, ${esc(first)}` });
    $('#dash-root').innerHTML = `<div class="dash"><aside class="dash-side panel"><div class="dash-user"><span class="avatar">${esc(me.name.trim()[0].toUpperCase())}</span><span><strong>${esc(me.name)}</strong><small>${esc(me.email)}</small></span></div>
      <nav aria-label="Account">${TABS.map(([id, label, ic]) => `<a class="dash-link ${id === tab ? 'on' : ''}" href="#${id}" ${id === tab ? 'aria-current="page"' : ''}>${icon(ic, 'w-4 h-4')}${label}</a>`).join('')}<button class="dash-link" data-d="logout">${icon('log-out', 'w-4 h-4')}Sign out</button></nav></aside>
      <section class="dash-main" id="dash-main">${PANES[tab]()}</section></div>`;
    icons();
  }
  const route = () => { const h = location.hash.slice(1); tab = PANES[h] ? h : 'overview'; editing = null; openOrder = null; render(); window.scrollTo({ top: 0 }); };

  /* ---------- form helpers ---------- */
  const setErr = (id, m) => { const el = $('#' + id); el.setAttribute('aria-invalid', m ? 'true' : 'false'); $('#' + id + '-err').textContent = m; return m; };
  const check = (pairs) => { let first = null; pairs.forEach(([id, fn]) => { const m = setErr(id, fn($('#' + id).value)); if (m && !first) first = $('#' + id); }); first && first.focus(); return !first; };
  const formErr = (id, m) => { const b = $('#' + id); b.hidden = !m; b.textContent = m || ''; };

  /* ---------- actions ---------- */
  const D = {
    toggle(el) { openOrder = openOrder === el.dataset.id ? null : el.dataset.id; render(); },
    reorder(el) { const o = allOrders().find((x) => x.id === el.dataset.id); if (!o) return; o.items.forEach((i) => FM_CART.add(i.id, i.qty)); Toast.show('Items added to your cart'); FM_CART.open(); },
    cancel(el) { if (!confirm('Cancel this order?')) return; const all = allOrders(), o = all.find((x) => x.id === el.dataset.id); if (o) { o.status = 'Cancelled'; ls.set('fm_orders', all); } Toast.show('Order cancelled', 'info'); render(); },
    claim() { const all = allOrders(); all.forEach((o) => { if (!o.uid) o.uid = me.id; }); ls.set('fm_orders', all); Toast.show('Orders added to your account'); render(); },
    'new-addr'() { editing = 'new'; render(); $('#a-name').focus(); }, 'cancel-addr'() { editing = null; render(); },
    'edit-addr'(el) { editing = el.dataset.id; render(); $('#a-name').focus(); },
    'del-addr'(el) { if (!confirm('Delete this address?')) return; ls.set('fm_addresses', addrs().filter((a) => a.id !== el.dataset.id)); Toast.show('Address deleted', 'info'); render(); },
    logout() { A.logout(); location.href = root() + 'index.html'; }
  };
  const forms = {
    'addr-form'() {
      if (!check([['a-name', V.name], ['a-phone', V.phone], ['a-pin', V.pin], ['a-city', V.req('the city')], ['a-state', V.state], ['a-line', V.req('the house / building')], ['a-area', V.req('the area / street')]])) return;
      const g = (id) => $('#' + id).value.trim(), list = addrs(), rec = { id: editing !== 'new' ? editing : 'a' + Date.now(), name: g('a-name'), phone: g('a-phone'), pin: g('a-pin'), city: g('a-city'), state: g('a-state'), line: g('a-line'), area: g('a-area'), type: $('input[name="a-type"]:checked').value };
      const i = list.findIndex((a) => a.id === rec.id); i > -1 ? (list[i] = rec) : list.unshift(rec); ls.set('fm_addresses', list);
      editing = null; Toast.show('Address saved'); render();
    },
    'pf-form'() {
      if (!check([['p-name', V.name], ['p-phone', (v) => (v.trim() ? V.phone(v) : '')]])) return;
      const r = A.update({ name: $('#p-name').value, phone: $('#p-phone').value }); if (!r.ok) return Toast.show(r.error, 'info');
      me = r.user; Toast.show('Profile updated'); render();
    },
    async 'pw-form'() {
      formErr('pw-error', '');
      if (!check([['w-old', (v) => (v ? '' : 'Enter your current password.')], ['w-new', A.V.pass], ['w-new2', (v) => (v === $('#w-new').value ? '' : 'Passwords don’t match.')]])) return;
      const r = await A.changePassword($('#w-old').value, $('#w-new').value);
      if (!r.ok) return formErr('pw-error', r.error); Toast.show('Password updated'); $('#pw-form').reset();
    },
    async 'del-form'() {
      formErr('del-error', ''); if (!check([['d-pass', (v) => (v ? '' : 'Enter your password to confirm.')]])) return;
      if (!confirm('Delete your account permanently?')) return;
      const r = await A.deleteAccount($('#d-pass').value); if (!r.ok) return formErr('del-error', r.error);
      ls.set('fm_orders', allOrders().filter((o) => o.uid !== me.id)); location.href = root() + 'index.html';
    }
  };

  function init() {
    const el = $('#dash-root'); if (!el) return;
    if (!A.requireLogin('dashboard')) return;
    me = A.user();
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-d]'); if (b && D[b.dataset.d]) { D[b.dataset.d](b); return; }
      if (e.target.closest('[data-action="wish"]') && tab === 'wishlist') setTimeout(render, 60); });
    el.addEventListener('submit', (e) => { const f = forms[e.target.id]; if (f) { e.preventDefault(); f(); } });
    window.addEventListener('hashchange', route); window.addEventListener('storage', (e) => { if (e.key === 'fm_session' && !A.user()) location.reload(); });
    route();
  }
  window.FM_DASH = { init };
})();
