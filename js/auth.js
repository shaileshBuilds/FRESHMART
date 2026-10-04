/* FRESHMART — Part 09: accounts (demo).
   Accounts live in this browser's localStorage (fm_users). Passwords are salted and hashed (SHA-256) before they are stored, and the
   plain password is never saved. A real shop needs a server for accounts: treat this as a front-end demo of the full flow.
   Pages: login.html, register.html (rendered here) and dashboard.html (js/dashboard.js). */
(function () {
  const U = window.FM_UI || {}, { Toast, icon } = U;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const root = () => document.body.dataset.root || '';
  const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const KU = 'fm_users', KS = 'fm_session', KL = 'fm_lock', MAX_TRIES = 5, LOCK_MS = 30000;
  const NEXT = { dashboard: 'dashboard.html', checkout: 'checkout.html', cart: 'cart.html', wishlist: 'wishlist.html' };   // whitelist: no open redirects
  const norm = (e) => String(e).trim().toLowerCase();

  /* ---------- validators (pure) ---------- */
  const V = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Enter your full name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
    phone: (v) => (!v.trim() || /^[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')) ? '' : 'Enter a valid 10-digit mobile number.'),
    pass: (v) => (v.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(v) || !/\d/.test(v) ? 'Include at least one letter and one number.' : ''),
    req: (v) => (v ? '' : 'Enter your password.'),
    strength(v) {
      if (!v) return 0; let s = 0;
      if (v.length >= 8) s++; if (v.length >= 12) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v) && /[A-Za-z]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
      return v.length < 8 ? 1 : Math.min(4, Math.max(1, s - 1));
    }
  };

  /* ---------- storage + hashing ---------- */
  const users = () => ls.get(KU, []), saveUsers = (l) => ls.set(KU, l);
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const salt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function hash(pw, s) {
    const text = s + ':' + pw;
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;                       // fallback for non-secure contexts (cyrb53)
    for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'x' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  const pub = (u) => u && { id: u.id, name: u.name, email: u.email, phone: u.phone || '', created: u.created };
  const readSession = () => { for (const s of [localStorage, sessionStorage]) { try { const v = JSON.parse(s.getItem(KS)); if (v && v.uid) return v; } catch {} } return null; };
  function setSession(uid, remember) {
    try { localStorage.removeItem(KS); sessionStorage.removeItem(KS); (remember ? localStorage : sessionStorage).setItem(KS, JSON.stringify({ uid, at: Date.now() })); } catch {}
  }
  const find = (id) => users().find((u) => u.id === id);
  const user = () => { const s = readSession(); return s ? pub(find(s.uid)) : null; };

  /* ---------- account actions (all async-safe, return { ok, error }) ---------- */
  async function register({ name, email, phone, password, remember }) {
    if (users().some((u) => u.email === norm(email))) return { ok: false, error: 'An account with this email already exists. Try signing in.' };
    const s = salt(), u = { id: 'u' + Date.now(), name: name.trim(), email: norm(email), phone: phone.replace(/[\s-]/g, ''), salt: s, hash: await hash(password, s), created: new Date().toISOString() };
    saveUsers([...users(), u]); setSession(u.id, remember); return { ok: true, user: pub(u) };
  }
  async function login({ email, password, remember }) {
    const lock = ls.get(KL, { n: 0, until: 0 });
    if (lock.until > Date.now()) return { ok: false, error: `Too many attempts. Try again in ${Math.ceil((lock.until - Date.now()) / 1000)} seconds.` };
    const u = users().find((x) => x.email === norm(email));
    if (u && (await hash(password, u.salt)) === u.hash) { ls.set(KL, { n: 0, until: 0 }); setSession(u.id, remember); return { ok: true, user: pub(u) }; }
    const n = (lock.until && lock.until <= Date.now() ? 0 : lock.n) + 1;
    ls.set(KL, n >= MAX_TRIES ? { n: 0, until: Date.now() + LOCK_MS } : { n, until: 0 });
    return { ok: false, error: n >= MAX_TRIES ? 'Too many attempts. Please wait 30 seconds and try again.' : 'Email or password is incorrect.' };
  }
  function logout() { try { localStorage.removeItem(KS); sessionStorage.removeItem(KS); } catch {} }
  function update(patch) {
    const s = readSession(), all = users(), u = s && all.find((x) => x.id === s.uid); if (!u) return { ok: false, error: 'Please sign in again.' };
    if (patch.name !== undefined) u.name = patch.name.trim(); if (patch.phone !== undefined) u.phone = patch.phone.replace(/[\s-]/g, '');
    saveUsers(all); return { ok: true, user: pub(u) };
  }
  async function changePassword(oldPw, newPw) {
    const s = readSession(), all = users(), u = s && all.find((x) => x.id === s.uid); if (!u) return { ok: false, error: 'Please sign in again.' };
    if ((await hash(oldPw, u.salt)) !== u.hash) return { ok: false, error: 'Your current password is incorrect.' };
    u.salt = salt(); u.hash = await hash(newPw, u.salt); saveUsers(all); return { ok: true };
  }
  async function deleteAccount(password) {
    const s = readSession(), all = users(), u = s && all.find((x) => x.id === s.uid); if (!u) return { ok: false, error: 'Please sign in again.' };
    if ((await hash(password, u.salt)) !== u.hash) return { ok: false, error: 'Password is incorrect.' };
    saveUsers(all.filter((x) => x.id !== u.id)); logout(); return { ok: true };
  }
  /* Demo only: with no email server, a reset happens straight away on this device. */
  async function resetPassword(email, newPw) {
    const all = users(), u = all.find((x) => x.email === norm(email)); if (!u) return { ok: false, error: 'We couldn’t find an account with that email.' };
    u.salt = salt(); u.hash = await hash(newPw, u.salt); saveUsers(all); ls.set(KL, { n: 0, until: 0 }); return { ok: true };
  }

  /* ---------- header + redirects ---------- */
  function syncHeader() {
    const b = $('[data-action="account"]'), u = user(); if (!b) return;
    b.setAttribute('aria-label', u ? `My account (${u.name})` : 'Sign in'); b.title = u ? u.name : 'Sign in';
    b.innerHTML = u ? `<span class="acct-initial">${esc(u.name.trim()[0].toUpperCase())}</span>` : icon('user');
    window.lucide && lucide.createIcons();
  }
  const go = (file) => (location.href = `${root()}pages/${file}`);
  const accountPage = () => go(user() ? 'dashboard.html' : 'login.html');
  const afterAuth = () => { const n = new URLSearchParams(location.search).get('next'); go(NEXT[n] || 'dashboard.html'); };
  const requireLogin = (next) => { if (user()) return true; go('login.html' + (next ? '?next=' + next : '')); return false; };

  /* ---------- login / register / forgot-password UI ---------- */
  const field = (id, label, o = {}) => `<div class="fld ${o.cls || ''}"><label for="${id}">${label}</label>${o.pw
    ? `<div class="pw-wrap"><input id="${id}" type="password" ${o.attrs || ''} aria-describedby="${id}-err"><button type="button" class="pw-toggle" data-auth="toggle-pw" data-for="${id}" aria-label="Show password" aria-pressed="false">${icon('eye', 'w-4 h-4')}</button></div>`
    : `<input id="${id}" type="${o.type || 'text'}" ${o.attrs || ''} aria-describedby="${id}-err">`}${o.meter ? '<div class="meter" id="meter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><small class="meter-label" id="meter-label" aria-live="polite"></small>' : ''}<small class="err" id="${id}-err" role="alert"></small></div>`;

  const POINTS = ['Free delivery on orders above ₹499', 'Track every order and reorder in one tap', 'Save addresses for faster checkout'];
  const art = (title, text) => `<aside class="auth-art"><span class="eyebrow">FRESHMART account</span><h1>${title}</h1><p>${text}</p><ul>${POINTS.map((p) => `<li>${icon('check-circle-2', 'w-5 h-5')}${p}</li>`).join('')}</ul><span class="auth-emoji" aria-hidden="true">🥑 🍓 🥕</span></aside>`;
  const qs = () => { const n = new URLSearchParams(location.search).get('next'); return NEXT[n] ? '?next=' + n : ''; };

  const VIEWS = {
    login: () => `<h2>Sign in</h2><p class="auth-sub">New to FRESHMART? <a href="register.html${qs()}">Create an account</a></p>
      <form id="auth-form" data-view="login" novalidate><p class="form-error" id="form-error" role="alert" hidden></p>
        ${field('f-email', 'Email address', { type: 'email', attrs: 'autocomplete="username" inputmode="email"' })}
        ${field('f-pass', 'Password', { pw: true, attrs: 'autocomplete="current-password"' })}
        <div class="auth-row"><label class="check"><input type="checkbox" id="f-remember" checked><span>Keep me signed in</span></label><button type="button" class="ci-link" data-auth="forgot">Forgot password?</button></div>
        <button class="btn btn-primary btn-lg w-full" type="submit" id="auth-submit">Sign in</button></form>`,
    register: () => `<h2>Create your account</h2><p class="auth-sub">Already have one? <a href="login.html${qs()}">Sign in</a></p>
      <form id="auth-form" data-view="register" novalidate><p class="form-error" id="form-error" role="alert" hidden></p>
        <div class="fld-grid">${field('f-name', 'Full name', { attrs: 'autocomplete="name"' })}${field('f-phone', 'Mobile number <span class="opt-l">(optional)</span>', { attrs: 'inputmode="numeric" maxlength="10" autocomplete="tel-national"' })}</div>
        ${field('f-email', 'Email address', { type: 'email', attrs: 'autocomplete="email" inputmode="email"' })}
        ${field('f-pass', 'Password', { pw: true, meter: true, attrs: 'autocomplete="new-password"' })}
        ${field('f-pass2', 'Confirm password', { pw: true, attrs: 'autocomplete="new-password"' })}
        <div class="fld"><label class="check"><input type="checkbox" id="f-terms" aria-describedby="f-terms-err"><span>I agree to the Terms of Use and Privacy Policy</span></label><small class="err" id="f-terms-err" role="alert"></small></div>
        <button class="btn btn-primary btn-lg w-full" type="submit" id="auth-submit">Create account</button></form>`,
    forgot: () => `<h2>Reset your password</h2><p class="auth-sub">Remembered it? <button type="button" class="ci-link" data-auth="back">Back to sign in</button></p>
      <form id="auth-form" data-view="forgot" novalidate><p class="form-error" id="form-error" role="alert" hidden></p>
        <p class="form-note">${icon('info', 'w-4 h-4')}Demo store: with no email server, your password is reset immediately on this device.</p>
        ${field('f-email', 'Account email', { type: 'email', attrs: 'autocomplete="username"' })}
        ${field('f-pass', 'New password', { pw: true, meter: true, attrs: 'autocomplete="new-password"' })}
        <button class="btn btn-primary btn-lg w-full" type="submit" id="auth-submit">Reset password</button></form>`
  };
  const RULES = { 'f-name': V.name, 'f-email': V.email, 'f-phone': V.phone };
  const rule = (id, view) => (id === 'f-pass' ? (view === 'login' ? V.req : V.pass) : id === 'f-pass2' ? (v) => (v === $('#f-pass').value ? '' : 'Passwords don’t match.') : RULES[id]);

  const setErr = (id, msg) => { const el = $('#' + id); if (!el) return ''; el.setAttribute('aria-invalid', msg ? 'true' : 'false'); const e = $('#' + id + '-err'); e && (e.textContent = msg); return msg; };
  const showForm = (msg) => { const b = $('#form-error'); b.hidden = !msg; b.textContent = msg || ''; };
  function validate(view) {
    const ids = $$('#auth-form input[id^="f-"]:not([type=checkbox])').map((i) => i.id); let first = null;
    ids.forEach((id) => { const r = rule(id, view), m = r ? setErr(id, r($('#' + id).value)) : ''; if (m && !first) first = $('#' + id); });
    if (view === 'register' && !$('#f-terms').checked) { $('#f-terms-err').textContent = 'Please accept the terms to continue.'; first = first || $('#f-terms'); } else if ($('#f-terms-err')) $('#f-terms-err').textContent = '';
    if (first) { first.focus(); return false; } return true;
  }
  const busy = (on, label) => { const b = $('#auth-submit'); if (!b) return; b.disabled = on; b.dataset.l = b.dataset.l || b.textContent; b.textContent = on ? label : b.dataset.l; };

  async function submit(e) {
    e.preventDefault(); const view = e.target.dataset.view; showForm(''); if (!validate(view)) return;
    const v = (id) => ($('#' + id) ? $('#' + id).value : ''), remember = $('#f-remember') ? $('#f-remember').checked : true;
    busy(true, view === 'login' ? 'Signing in…' : view === 'register' ? 'Creating account…' : 'Resetting…');
    const r = view === 'login' ? await login({ email: v('f-email'), password: v('f-pass'), remember })
      : view === 'register' ? await register({ name: v('f-name'), email: v('f-email'), phone: v('f-phone'), password: v('f-pass'), remember: true })
      : await resetPassword(v('f-email'), v('f-pass'));
    if (!r.ok) { busy(false); showForm(r.error); $('#form-error').scrollIntoView({ block: 'nearest' }); return; }
    if (view === 'forgot') { Toast.show('Password updated. Please sign in.'); return show('login'); }
    Toast.show(view === 'register' ? `Welcome to FRESHMART, ${r.user.name.split(' ')[0]}!` : `Welcome back, ${r.user.name.split(' ')[0]}!`);
    setTimeout(afterAuth, 700);
  }

  function show(view) {
    const card = $('#auth-card'); card.innerHTML = VIEWS[view](); window.lucide && lucide.createIcons();
    const f = $('#auth-form', card); f && (f.querySelector('input') || f).focus({ preventScroll: true });
  }
  function onInput(e) {
    const t = e.target; if (!t.id || t.id.indexOf('f-') !== 0) return;
    if (t.id === 'f-pass' && $('#meter')) { const s = V.strength(t.value); $('#meter').dataset.s = s; $('#meter-label').textContent = t.value ? ['', 'Weak', 'Fair', 'Good', 'Strong'][s] + ' password' : ''; }
    if (t.getAttribute('aria-invalid') === 'true') { const r = rule(t.id, $('#auth-form').dataset.view); r && setErr(t.id, r(t.value)); }
  }
  function onClick(e) {
    const el = e.target.closest('[data-auth]'); if (!el) return; const a = el.dataset.auth;
    if (a === 'toggle-pw') { const i = $('#' + el.dataset.for), on = i.type === 'password'; i.type = on ? 'text' : 'password'; el.setAttribute('aria-pressed', on); el.setAttribute('aria-label', on ? 'Hide password' : 'Show password'); el.innerHTML = icon(on ? 'eye-off' : 'eye', 'w-4 h-4'); window.lucide && lucide.createIcons(); }
    else if (a === 'forgot') show('forgot'); else if (a === 'back') show('login');
  }

  function init() {
    const el = $('#auth-root'); if (!el) return;
    if (user()) return afterAuth();                                        // already signed in
    const mode = el.dataset.mode === 'register' ? 'register' : 'login';
    el.innerHTML = `<div class="auth">${mode === 'login' ? art('Welcome back', 'Sign in to track orders, reorder favourites and check out faster.') : art('Join FRESHMART', 'Create a free account to save addresses, track orders and keep your wishlist.')}<section class="auth-card" id="auth-card" aria-live="polite"></section></div>`;
    show(mode);
    el.addEventListener('submit', submit); el.addEventListener('input', onInput); el.addEventListener('click', onClick);
    el.addEventListener('focusout', (e) => { const t = e.target; if (t.id && rule(t.id, $('#auth-form') && $('#auth-form').dataset.view) && t.type !== 'checkbox' && t.value !== '') setErr(t.id, rule(t.id, $('#auth-form').dataset.view)(t.value)); });
    window.lucide && lucide.createIcons();
  }

  window.addEventListener('storage', (e) => { if ([KS, KU].includes(e.key)) syncHeader(); });
  window.FM_AUTH = { init, user, login, register, logout, update, changePassword, deleteAccount, resetPassword, syncHeader, accountPage, requireLogin, V, NEXT };
})();
