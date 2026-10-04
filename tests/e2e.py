"""FRESHMART Part 11 — functional smoke tests (python3 tests/e2e.py). Offline-safe (CDNs stubbed)."""
import sys, os, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv = socketserver.TCPServer(('127.0.0.1',0), functools.partial(H, directory=ROOT)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
U = lambda p: f'http://127.0.0.1:{port}/{p}'
res = []
def check(name, cond, extra=''):
    res.append(bool(cond)); print(('PASS' if cond else 'FAIL'), name, extra if not cond else '')
def newctx(b, w=1280, h=800):
    c = b.new_context(viewport={'width':w,'height':h}, has_touch=w<800)
    c.route('**/cdn.tailwindcss.com/**', lambda r: r.fulfill(body="window.tailwind={};document.head.insertAdjacentHTML('beforeend','<style>*{box-sizing:border-box}.hidden{display:none}</style>')", content_type='text/javascript'))
    c.route('**/unpkg.com/**', lambda r: r.fulfill(body="window.lucide={createIcons(){}}", content_type='text/javascript'))
    c.route('**/fonts.g*/**', lambda r: r.fulfill(body='', content_type='text/css'))
    return c
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for label, w in (('desktop',1280),('mobile',390)):
        print(f'\n== {label} {w}px ==')
        c = newctx(b, w); p = c.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(U('index.html')); p.wait_for_timeout(300)
        check('home renders product cards', p.locator('.product-card').count() > 20)
        check('home renders categories', p.locator('#category-tiles > *').count() >= 6)
        check('flash countdown ticking', p.locator('#cd-s').text_content().isdigit())
        # newsletter validation
        f = p.locator('form[data-newsletter=home]'); f.locator('input').fill('bad'); f.locator('button').click()
        check('newsletter rejects bad email', 'valid email' in f.locator('.news-msg').text_content())
        f.locator('input').fill('a@b.co'); f.locator('button').click(); p.wait_for_timeout(100)
        check('newsletter accepts good email', f.locator('.news-msg').text_content() == '')
        # add to cart
        p.locator('[data-action=add]').first.click(); p.wait_for_timeout(200)
        cart = p.evaluate("localStorage.getItem('fm_cart')"); check('add-to-cart persists', cart and len(cart) > 2, cart)
        # wishlist
        p.locator('[data-action=wish]').first.click(); p.wait_for_timeout(100)
        check('wishlist persists', any('wish' in k and (localStorage_v := p.evaluate(f"localStorage.getItem('{k}')")) and len(localStorage_v)>2 for k in p.evaluate("Object.keys(localStorage)")))
        # mobile menu
        if w < 800:
            p.locator('[data-action=toggle-menu]').click()
            check('mobile menu opens', p.locator('#main-nav').evaluate("e=>e.classList.contains('open')"))
        # cart page
        p.goto(U('pages/cart.html')); p.wait_for_timeout(300)
        check('cart page lists item', p.locator('#cart-root').inner_text().strip() != '' and 'empty' not in p.locator('#cart-root').inner_text().lower()[:40])
        # shop
        p.goto(U('pages/shop.html?cat=dairy-bakery')); p.wait_for_timeout(300)
        n = p.locator('#product-grid .product-card').count(); check('shop category filter', 0 < n < 60, n)
        p.goto(U('pages/shop.html?q=rice')); p.wait_for_timeout(300)
        n = p.locator('#product-grid .product-card').count(); check('shop search q=rice', 0 < n < 20, n)
        p.select_option('#sort', index=2); p.wait_for_timeout(200)
        check('shop sort works (no error)', not errs)
        # product page
        p.goto(U('pages/product.html?id=1')); p.wait_for_timeout(300)
        check('product page renders', 'Banana' in p.inner_text('main'))
        # checkout & dashboard load without errors
        for pg in ('checkout','dashboard','login','register','wishlist','offers','faq','contact','about','order-success'):
            p.goto(U(f'pages/{pg}.html')); p.wait_for_timeout(250)
        check('all pages load without JS errors', not errs, errs[:3])
        # 404 page (deployment)
        r = p.goto(U('404.html')); check('404.html exists', r.status == 200)
        c.close()
    b.close()
print(f'\n{sum(res)}/{len(res)} passed'); sys.exit(0 if all(res) else 1)
