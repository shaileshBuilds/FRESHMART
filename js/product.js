/* FRESHMART — product details page (pages/product.html?id=ID). */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { SectionHeading, Toast, rupee, icon } = FM_UI;
  let p = null, qty = 1;
  const maxQty = () => Math.min(10, p.stock);
  const stars = (r) => [1, 2, 3, 4, 5].map((i) => icon('star', 'w-4 h-4' + (r >= i - 0.25 ? ' star-on' : ''))).join('');
  const city = () => { try { return JSON.parse(localStorage.getItem('fm_city')) || 'your city'; } catch { return 'your city'; } };

  function notFound() {
    return `<div class="empty">We couldn't find that product.<br><a class="btn btn-primary btn-sm mt-4" href="shop.html">Browse all products</a></div>`;
  }

  function html(id) {
    p = FM.db.getProductById(id); qty = 1;
    if (!p) return notFound();
    const cat = FM.db.getCategoryById(p.category), save = p.originalPrice - p.price, root = document.body.dataset.root || '';
    const stock = p.stock > 20 ? `<span class="stock ok">${icon('check-circle-2', 'w-4 h-4')}In stock</span>` : `<span class="stock low">${icon('alert-circle', 'w-4 h-4')}Only ${p.stock} left</span>`;
    const related = FM.db.getProductsByCategory(p.category).filter((x) => x.id !== p.id).sort((a, b) => b.rating - a.rating).slice(0, 4);
    const sameBrand = FM.products.filter((x) => x.brand === p.brand && x.id !== p.id && !related.includes(x)).slice(0, 4);
    const rail = (title, eyebrow, list) => list.length ? `<section class="pd-section">${SectionHeading({ eyebrow, title })}<div class="product-grid" id="${eyebrow === 'Similar items' ? 'related-grid' : 'brand-grid'}">${FM_APP.cards(list)}</div></section>` : '';
    return `
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}index.html">Home</a><span>/</span><a href="shop.html">Shop</a><span>/</span><a href="shop.html?cat=${cat.id}">${esc(cat.name)}</a><span>/</span><span>${esc(p.name)}</span></nav>
    <div class="pd-grid">
      <div class="pd-gallery" id="pd-zoom" style="--tint:${cat.tint}">
        ${p.discount > 0 ? `<span class="badge">-${p.discount}%</span>` : ''}
        <span class="pd-emoji" aria-hidden="true">${p.emoji}</span>
        <img src="${root}${p.image}" alt="${esc(p.name)}" onerror="this.remove()">
      </div>
      <div class="pd-info">
        <a class="pd-brand" href="shop.html?brand=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a>
        <h1>${esc(p.name)}</h1>
        <div class="pd-rate"><span class="stars" aria-label="${p.rating} out of 5">${stars(p.rating)}</span><b>${p.rating}</b><span>${p.reviews.toLocaleString('en-IN')} reviews</span><span class="dot">•</span><span>${esc(p.weight)}</span></div>
        <div class="pd-price"><b>${rupee(p.price)}</b>${save > 0 ? `<s>${rupee(p.originalPrice)}</s><em>${p.discount}% off</em>` : ''}</div>
        ${save > 0 ? `<p class="pd-save">You save ${rupee(save)} · Inclusive of all taxes</p>` : '<p class="pd-save">Inclusive of all taxes</p>'}
        <p class="pd-desc">${esc(p.description)}</p>
        ${stock}
        <div class="pd-buy">
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" data-pd="dec" aria-label="Decrease quantity">${icon('minus', 'w-4 h-4')}</button>
            <input id="pd-qty" type="number" min="1" max="${maxQty()}" value="1" aria-label="Quantity">
            <button type="button" data-pd="inc" aria-label="Increase quantity">${icon('plus', 'w-4 h-4')}</button>
          </div>
          <button type="button" class="btn btn-primary btn-lg pd-add" id="pd-add" data-action="add" data-id="${p.id}" data-qty="1">${icon('shopping-bag', 'w-5 h-5')}<span>Add to cart · ${rupee(p.price)}</span></button>
        </div>
        <div class="pd-actions">
          <button type="button" class="wish-btn ${FM_APP.wished(p.id) ? 'is-active' : ''}" data-action="wish" data-id="${p.id}" aria-pressed="${FM_APP.wished(p.id)}">${icon('heart', 'w-4 h-4')}<span>Wishlist</span></button>
          <button type="button" class="pd-share" data-pd="share">${icon('share-2', 'w-4 h-4')}<span>Share</span></button>
        </div>
        <ul class="pd-perks">
          <li>${icon('truck', 'w-5 h-5')}Free delivery on orders above ${rupee(FM.freeDeliveryMin)}</li>
          <li>${icon('clock', 'w-5 h-5')}Delivered within 60 minutes in ${esc(city())}</li>
          <li>${icon('badge-check', 'w-5 h-5')}Quality checked before dispatch</li>
        </ul>
      </div>
    </div>
    <section class="pd-tabs">
      <div class="tab-list" role="tablist">
        <button role="tab" class="on" aria-selected="true" data-pd="tab" data-t="desc">Description</button>
        <button role="tab" aria-selected="false" data-pd="tab" data-t="info">Product details</button>
        <button role="tab" aria-selected="false" data-pd="tab" data-t="ship">Delivery</button>
      </div>
      <div class="tab-panel" id="tab-desc"><p>${esc(p.description)} Sold by FRESHMART in a ${esc(p.weight)} pack from ${esc(p.brand)}.</p></div>
      <div class="tab-panel" id="tab-info" hidden><table class="pd-table"><tbody>
        <tr><th>Brand</th><td>${esc(p.brand)}</td></tr><tr><th>Category</th><td>${esc(cat.name)}</td></tr><tr><th>Pack size</th><td>${esc(p.weight)}</td></tr>
        <tr><th>MRP</th><td>${rupee(p.originalPrice)}</td></tr><tr><th>Customer rating</th><td>${p.rating} / 5 (${p.reviews.toLocaleString('en-IN')} reviews)</td></tr><tr><th>SKU</th><td>FM-${String(p.id).padStart(4, '0')}</td></tr>
      </tbody></table></div>
      <div class="tab-panel" id="tab-ship" hidden><p>Orders above ${rupee(FM.freeDeliveryMin)} are delivered free. Most orders arrive within 60 minutes. Delivery charges for smaller orders are shown at checkout.</p></div>
    </section>
    ${rail('You may also like', 'Similar items', related)}${rail(`More from ${esc(p.brand)}`, 'Same brand', sameBrand)}
    <div id="rec-root"></div>`;
  }

  const setQty = (n) => {
    qty = Math.min(maxQty(), Math.max(1, n | 0 || 1));
    $('#pd-qty').value = qty; $('#pd-add').dataset.qty = qty;
    $('#pd-add span').textContent = `Add to cart · ${rupee(p.price * qty)}`;
    if (qty === maxQty() && n > qty) Toast.show(`Maximum ${maxQty()} per order`, 'info');
  };

  function init() {
    const id = new URLSearchParams(location.search).get('id');
    $('#product-root').innerHTML = html(id);
    if (p) {
      document.title = `${p.name} — FRESHMART`;
      const m = document.querySelector('meta[name="description"]'); if (m) m.content = `${p.name} by ${p.brand}, ${p.weight} — ${p.description}`;
      const z = $('#pd-zoom');
      z.addEventListener('mousemove', (e) => { const r = z.getBoundingClientRect(); z.style.setProperty('--zx', ((e.clientX - r.left) / r.width * 100) + '%'); z.style.setProperty('--zy', ((e.clientY - r.top) / r.height * 100) + '%'); z.classList.add('zoom'); });
      z.addEventListener('mouseleave', () => z.classList.remove('zoom'));
      $('#pd-qty').addEventListener('change', (e) => setQty(+e.target.value));
      if (window.FM_REC) { $('#rec-root').innerHTML = FM_REC.product(p); FM_REC.viewed.add(p.id); }
    }
    window.lucide && lucide.createIcons();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-pd]'); if (!el || !p) return;
    const a = el.dataset.pd;
    if (a === 'inc') setQty(qty + 1);
    else if (a === 'dec') setQty(qty - 1);
    else if (a === 'tab') {
      document.querySelectorAll('.tab-list button').forEach((b) => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      document.querySelectorAll('.tab-panel').forEach((t) => (t.hidden = t.id !== 'tab-' + el.dataset.t));
    } else if (a === 'share') {
      const done = () => Toast.show('Product link copied');
      (navigator.clipboard ? navigator.clipboard.writeText(location.href).then(done) : Promise.reject()).catch(() => Toast.show('Copy the link from your address bar', 'info'));
    }
  });

  window.FM_PRODUCT = { init, html };
})();
