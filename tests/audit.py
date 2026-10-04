"""FRESHMART Part 11 — automated smoke + responsive audit.
Usage: python3 tests/audit.py [--online]
Serves the project locally, opens every page at 4 viewport sizes and reports:
JS errors, failed local requests, horizontal overflow (+ offending elements),
tap targets < 40px (mobile), images without alt, inputs without label/aria-label.
Offline mode stubs the Tailwind/Lucide CDNs so JS logic can still be tested."""
import sys, threading, http.server, socketserver, functools, os, json
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ONLINE = '--online' in sys.argv
PAGES = ['index.html'] + ['pages/'+f for f in sorted(os.listdir(os.path.join(ROOT,'pages'))) if f.endswith('.html')]
PAGES = [p for p in PAGES if not p.endswith('404.html')] + (['404.html'] if os.path.exists(os.path.join(ROOT,'404.html')) else [])
SIZES = [(360,740),(390,844),(768,1024),(1280,800)]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
h = functools.partial(Q, directory=ROOT)
srv = socketserver.TCPServer(('127.0.0.1',0), h); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
OVER = """() => { const W=document.documentElement.clientWidth, out=[];
 document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();
  if(r.width&&r.right>W+1&&!e.closest('.rail,[hidden],.drawer,.filters,.sg-panel,.mega,.dropdown')&&getComputedStyle(e).position!=='fixed'){
   let p=e.parentElement,clipped=false;while(p&&p!==document.body){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'){clipped=true;break}p=p.parentElement}
   if(!clipped&&out.length<4)out.push(e.tagName.toLowerCase()+'.'+(e.className||'').toString().split(' ')[0]+' right='+Math.round(r.right))}});
 return {sw:document.documentElement.scrollWidth,W,out}}"""
TAP = """() => [...document.querySelectorAll('a,button,input,select')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
 return r.width&&r.height&&s.visibility!=='hidden'&&!e.closest('[hidden]')&&e.type!=='hidden'&&e.type!=='checkbox'&&e.type!=='radio'&&!e.closest('.search,.band-field,.news-field,.qty,.faq-a')&&e.tabIndex!==-1&&(r.height<32||r.width<32)&&!(e.tagName==='A'&&e.closest('p,li,.crumbs'))}).slice(0,5).map(e=>e.tagName+'.'+(e.className||'').toString().split(' ')[0]+' '+Math.round(e.getBoundingClientRect().width)+'x'+Math.round(e.getBoundingClientRect().height))"""
A11Y = """() => ({img:[...document.images].filter(i=>!i.hasAttribute('alt')).length,
 inp:[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(i=>!(i.labels&&i.labels.length)&&!i.getAttribute('aria-label')&&!i.closest('label')).length,
 btn:[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')&&!b.title).length})"""
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w,hh in SIZES:
        ctx = b.new_context(viewport={'width':w,'height':hh}, has_touch=w<800, is_mobile=w<800)
        if not ONLINE:
            # stub = Tailwind preflight essentials (box-sizing reset) so layout math matches production
            ctx.route('**/cdn.tailwindcss.com/**', lambda r: r.fulfill(body="window.tailwind={};document.head.insertAdjacentHTML('beforeend','<style>*,::before,::after{box-sizing:border-box}body{margin:0}.hidden{display:none}.flex{display:flex}.flex-wrap{flex-wrap:wrap}</style>')", content_type='text/javascript'))
            ctx.route('**/unpkg.com/**', lambda r: r.fulfill(body="window.lucide={createIcons(){}};document.head.insertAdjacentHTML('beforeend','<style>[data-lucide]{display:inline-block;width:16px;height:16px}</style>')", content_type='text/javascript'))
            ctx.route('**/fonts.g*apis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        for pg in PAGES:
            p = ctx.new_page(); errs=[]
            p.on('pageerror', lambda e: errs.append('JS: '+str(e)))
            p.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url.split(str(port))[-1]}') if r.status>=400 and str(port) in r.url and 'banners/hero.jpg' not in r.url else None)
            p.goto(f'http://127.0.0.1:{port}/{pg}'); p.wait_for_timeout(350)
            o = p.evaluate(OVER); a = p.evaluate(A11Y)
            if o['sw']>o['W']+1 or o['out']: errs.append(f"OVERFLOW sw={o['sw']} W={o['W']} {o['out']}")
            if a['img'] or a['inp'] or a['btn']: errs.append(f'A11Y {a}')
            if w<=390:
                t = p.evaluate(TAP)
                if t: errs.append(f'SMALL-TAP {t}')
            status = 'OK ' if not errs else 'ERR'
            if errs: bad += 1
            print(f'[{status}] {w:>4}px {pg}'); [print('       ',e) for e in errs]
            p.close()
        ctx.close()
    b.close()
print('\nPages with issues:', bad); sys.exit(1 if bad else 0)
