/* FRESHMART test helpers — static server + Playwright page factory.
   Works offline: CDN assets (Tailwind play script, Lucide, Google Fonts) are replaced with local stand-ins during tests. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

function serve(port = 0) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
    }).listen(port, () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}

/* Stand-in for Lucide: swaps <i data-lucide> for a 24px svg that keeps the original classes (so sizing utilities still apply). */
const LUCIDE_STUB = `window.lucide={createIcons(){document.querySelectorAll('i[data-lucide]').forEach(i=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('width','24');s.setAttribute('height','24');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','lucide '+(i.getAttribute('class')||''));s.setAttribute('aria-hidden','true');s.innerHTML='<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor"/>';i.replaceWith(s);});}};`;
/* Stand-in for the Tailwind play CDN: appends the locally built stylesheet to <head> (same cascade position as the CDN's <style>). */
const TW_STUB = `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='/css/tailwind.css';document.head.appendChild(l);window.tailwind={config:{}};})();`;

async function newPage(browser, base, { width = 1280, height = 800, seed = {}, session = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 900, isMobile: false });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(base)) return route.continue();
    if (u.includes('cdn.tailwindcss.com')) return route.fulfill({ contentType: 'application/javascript', body: TW_STUB });
    if (u.includes('lucide')) return route.fulfill({ contentType: 'application/javascript', body: LUCIDE_STUB });
    if (u.includes('fonts.googleapis.com')) return route.fulfill({ contentType: 'text/css', body: '' });
    return route.abort();
  });
  await ctx.addInitScript(([seed, session]) => {
    try { if (!sessionStorage.getItem('__seeded')) { Object.entries(seed).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v))); Object.entries(session).forEach(([k, v]) => sessionStorage.setItem(k, JSON.stringify(v))); sessionStorage.setItem('__seeded', '1'); } } catch {}
  }, [seed, session]);
  const page = await ctx.newPage();
  const problems = { console: [], page: [], http: [] };
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource.*ERR_FAILED/.test(m.text())) problems.console.push(m.text()); });
  page.on('pageerror', (e) => problems.page.push(String(e.message || e)));
  page.on('response', (r) => { if (r.url().startsWith(base) && r.status() >= 400) problems.http.push(r.status() + ' ' + r.url().replace(base, '')); });
  return { page, ctx, problems };
}

/* Demo data used to put pages that need state (cart, checkout, dashboard, order-success) into a realistic condition. */
const USER = { id: 'u1', name: 'Test Shopper', email: 'test@example.com', phone: '9876543210', salt: 'ab', hash: 'cd', created: '2026-09-01T10:00:00.000Z' };
const ADDR = { id: 'a1', name: 'Test Shopper', phone: '9876543210', line: '12 Gomti Nagar', city: 'Lucknow', pin: '226010', type: 'Home' };
const ORDER = { id: 'FM2610049999', uid: 'u1', placed: new Date(Date.now() - 3600e3).toISOString(), status: 'Confirmed',
  items: [{ id: 1, name: 'Robusta Bananas', weight: '1 kg', price: 49, qty: 2, emoji: '🍌', image: 'assets/images/products/1-robusta-bananas.svg' }, { id: 17, name: 'Classic Basmati Rice', weight: '1 kg', price: 129, qty: 1, emoji: '🍚', image: 'assets/images/products/17-classic-basmati-rice.svg' }],
  totals: { mrp: 240, savings: 13, coupon: '', discount: 0, delivery: 40, total: 267 }, address: ADDR, slot: 'Express · within 60 minutes', payment: 'Cash on delivery', paid: false };
const SEED_FULL = { fm_cart: { 1: 2, 17: 1, 24: 3, 45: 1 }, fm_wish: [2, 3, 5], fm_users: [USER], fm_orders: [ORDER], fm_addresses: [ADDR], fm_addr_sel: 'a1' };
const SESSION_FULL = { fm_session: { uid: 'u1', at: Date.now() } };

const PAGES = [
  ['home', '/index.html'], ['shop', '/pages/shop.html?cat=all'], ['product', '/pages/product.html?id=1'], ['cart', '/pages/cart.html'],
  ['checkout', '/pages/checkout.html'], ['order-success', '/pages/order-success.html?id=FM2610049999'], ['wishlist', '/pages/wishlist.html'],
  ['login', '/pages/login.html'], ['register', '/pages/register.html'], ['dashboard', '/pages/dashboard.html'],
  ['offers', '/pages/offers.html'], ['about', '/pages/about.html'], ['faq', '/pages/faq.html'], ['contact', '/pages/contact.html']
];
const GUEST_PAGES = ['login', 'register'];
module.exports = { serve, newPage, PAGES, GUEST_PAGES, SEED_FULL, SESSION_FULL, ROOT };
