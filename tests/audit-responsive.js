/* Responsive audit: every page × 7 viewport widths. Reports horizontal overflow, offending elements, small tap targets, tiny inputs, JS errors, 404s, broken images. */
const { chromium } = require('playwright');
const { serve, newPage, PAGES, GUEST_PAGES, SEED_FULL, SESSION_FULL } = require('./helpers');
const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1536];
const only = process.argv.includes('--json');

(async () => {
  const { srv, url } = await serve();
  const browser = await chromium.launch();
  const report = [];
  for (const w of WIDTHS) for (const [name, path] of PAGES) {
    const { page, ctx, problems } = await newPage(browser, url, { width: w, height: w < 700 ? 800 : 900, seed: SEED_FULL, session: GUEST_PAGES.includes(name) ? {} : SESSION_FULL });
    await page.goto(url + path, { waitUntil: 'load' }); await page.waitForTimeout(350);
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth, out = {};
      out.scrollW = document.documentElement.scrollWidth; out.vw = vw;
      const visible = (el) => { const s = getComputedStyle(el), b = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 0 && b.height > 0; };
      const insideScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll' || o === 'hidden') && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
      const inOffscreenFixed = (el) => { for (let p = el; p && p !== document.body; p = p.parentElement) { if (getComputedStyle(p).position === 'fixed') return true; } return false; };
      out.overflowEls = [...document.querySelectorAll('body *')].filter((el) => visible(el) && !insideScroller(el) && !inOffscreenFixed(el) && el.getBoundingClientRect().right > vw + 1 && !el.closest('svg'))
        .slice(0, 6).map((el) => `${el.tagName.toLowerCase()}.${String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\s+/).slice(0, 3).join('.')} r=${Math.round(el.getBoundingClientRect().right)}`);
      const tap = [...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button]')].filter((el) => visible(el) && !el.closest('[hidden], .hp') && !(el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type) && el.closest('label')));
      out.smallTap = tap.filter((el) => { const b = el.getBoundingClientRect(); return (b.width < 32 || b.height < 32) && !(el.tagName === 'A' && el.closest('p, li, .crumbs') && b.height >= 16 && el.textContent.trim().length > 3); })
        .slice(0, 8).map((el) => `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 18)}"`);
      out.smallTapCount = tap.filter((el) => { const b = el.getBoundingClientRect(); return b.width < 32 || b.height < 32; }).length;
      out.tinyInputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter((el) => visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16).length;
      out.brokenImgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length;
      out.noAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
      out.emptyRoot = ['product-root', 'cart-root', 'checkout-root', 'success-root', 'dash-root', 'auth-root', 'wish-root', 'page-root', 'shop-root'].filter((id) => { const e = document.getElementById(id); return e && !e.children.length; });
      return out;
    });
    report.push({ w, name, ...r, js: problems.page.concat(problems.console), http: problems.http });
    await ctx.close();
  }
  await browser.close(); srv.close();
  if (only) return console.log(JSON.stringify(report));
  let bad = 0;
  for (const r of report) {
    const issues = [];
    if (r.scrollW > r.vw) issues.push(`H-SCROLL ${r.scrollW}>${r.vw} [${r.overflowEls.join(' | ')}]`);
    if (r.js.length) issues.push('JS: ' + r.js.slice(0, 2).join(' || '));
    if (r.http.length) issues.push('HTTP: ' + [...new Set(r.http)].slice(0, 3).join(', '));
    if (r.brokenImgs) issues.push(`${r.brokenImgs} broken img`);
    if (r.emptyRoot.length) issues.push('EMPTY ' + r.emptyRoot.join(','));
    if (r.w <= 414 && r.tinyInputs) issues.push(`${r.tinyInputs} inputs <16px (iOS zoom)`);
    if (r.w <= 414 && r.smallTap.length) issues.push(`${r.smallTapCount} small taps: ${r.smallTap.slice(0, 5).join('; ')}`);
    if (issues.length) { bad++; console.log(`[${r.w}] ${r.name}: ${issues.join('\n        ')}`); }
  }
  console.log(`\n${report.length} page-views checked, ${bad} with findings`);
})().catch((e) => { console.error(e); process.exit(1); });
