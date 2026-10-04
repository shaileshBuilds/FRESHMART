/* FRESHMART — reusable UI components. Pages need only <div data-component="header|footer"> and data-root on <body>. */
(function () {
  const root = () => document.body.dataset.root || '';
  const rupee = (n) => '₹' + n.toLocaleString('en-IN');
  const icon = (name, cls = 'w-5 h-5') => `<i data-lucide="${name}" class="${cls}"></i>`;

  /* variant: primary | secondary | outline | ghost — size: sm | lg */
  const Button = ({ label, variant = 'primary', icon: ic, action = '', attrs = '', size = '' }) =>
    `<button type="button" class="btn btn-${variant} ${size ? 'btn-' + size : ''}" ${action ? `data-action="${action}"` : ''} ${attrs}>${ic ? icon(ic, 'w-4 h-4') : ''}${label}</button>`;

  const SectionHeading = ({ eyebrow = '', title, subtitle = '' }) =>
    `<div class="section-heading">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}<h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>`;

  const productUrl = (p) => `${root()}pages/product.html?id=${p.id}`;
  const ProductCard = (p, wished = false) => `
    <article class="product-card">
      <div class="product-media" style="--tint:${(FM.categories.find(c => c.id === p.category) || {}).tint || '#EEF6E4'}">
        <a class="media-link" href="${productUrl(p)}" aria-label="View ${p.name}"></a>
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
        <button class="wish-btn ${wished ? 'is-active' : ''}" data-action="wish" data-id="${p.id}" aria-label="${wished ? 'Remove from' : 'Add to'} wishlist" aria-pressed="${wished}">${icon('heart', 'w-4 h-4')}</button>
        ${p.image ? `<img class="product-img" src="${root()}${p.image}" alt="${p.name}" loading="lazy" onerror="this.remove()">` : ''}<span class="product-emoji" aria-hidden="true">${p.emoji}</span>
      </div>
      <div class="p-4">
        <h3 class="product-name"><a href="${productUrl(p)}">${p.name}</a></h3>
        <p class="text-muted text-sm">${p.weight}</p>
        <p class="rating"><span>★ ${p.rating}</span> ${p.reviews >= 1000 ? (p.reviews / 1000).toFixed(1) + 'k' : p.reviews} reviews</p>
        <div class="flex items-end justify-between mt-3">
          <div><span class="price">${rupee(p.price)}</span>${p.originalPrice ? `<span class="price-old">${rupee(p.originalPrice)}</span>` : ''}</div>
          <span class="add-slot" data-id="${p.id}" data-q="${window.FM_CART ? FM_CART.qty(p.id) : 0}">${window.FM_CART ? FM_CART.slot(p) : Button({ label: 'Add', icon: 'plus', action: 'add', attrs: `data-id="${p.id}"`, size: 'sm' })}</span>
        </div>
      </div>
    </article>`;


  const CategoryTile = (c, href) => `<a class="cat-tile" href="${href}"><span class="cat-ico">${icon(c.icon, 'w-6 h-6')}</span><span>${c.name}</span></a>`;
  const Testimonial = (t) => `<figure class="testi"><div class="stars" aria-label="5 out of 5 stars">${icon('star', 'w-4 h-4')}${icon('star', 'w-4 h-4')}${icon('star', 'w-4 h-4')}${icon('star', 'w-4 h-4')}${icon('star', 'w-4 h-4')}</div><blockquote>${t.text}</blockquote><figcaption><span class="avatar">${t.name[0]}</span><span><strong>${t.name}</strong><small>${t.city}</small></span></figcaption></figure>`;

  const Header = () => {
    const r = root();
    const mega = FM.categories.map(c => `
      <div class="mega-col">
        <button class="mega-title" data-cat="${c.id}">${icon(c.icon, 'w-4 h-4')}${c.name}</button>
        <ul>${c.sub.map(s => `<li><button data-cat="${c.id}">${s}</button></li>`).join('')}</ul>
      </div>`).join('');
    const cities = FM.cities.map(c => `<button role="option" data-action="set-loc" data-city="${c}">${c}</button>`).join('');
    return `
    <div class="announce" id="announce">
      <div class="container-fm flex items-center justify-between gap-4 py-2 text-sm">
        <p class="flex items-center gap-2 mx-auto text-center">${icon('truck', 'w-4 h-4')}Free delivery on orders above ${rupee(FM.freeDeliveryMin)} · Fresh in 60 minutes</p>
        <button data-action="close-announce" aria-label="Dismiss announcement">${icon('x', 'w-4 h-4')}</button>
      </div>
    </div>
    <header class="site-header">
      <div class="container-fm main-row">
        <button class="icon-btn menu-toggle" data-action="toggle-menu" aria-label="Open menu" aria-expanded="false">${icon('menu')}</button>
        <a href="${r}index.html" class="logo" aria-label="FRESHMART home"><span class="logo-mark">${icon('leaf', 'w-5 h-5')}</span>FRESH<b>MART</b></a>
        <div class="loc-wrap">
          <button class="loc-btn" data-action="toggle-loc" aria-haspopup="listbox" aria-expanded="false">
            ${icon('map-pin', 'w-4 h-4 text-primary')}<span><small>Deliver to</small><strong id="loc-label">Lucknow</strong></span>${icon('chevron-down', 'w-4 h-4')}
          </button>
          <div class="dropdown" id="loc-panel" role="listbox" hidden>${cities}</div>
        </div>
        <form class="search" id="search-form" role="search">
          ${icon('search', 'w-5 h-5 text-muted')}
          <input id="search-input" type="search" placeholder="Search for fruits, dairy, bakery…" aria-label="Search products" autocomplete="off">
          <button type="submit" class="btn btn-primary btn-sm">Search</button>
        </form>
        <div class="header-actions">
          <button class="icon-btn" data-action="account" aria-label="Account">${icon('user')}</button>
          <a class="icon-btn" href="${r}pages/wishlist.html" aria-label="Wishlist">${icon('heart')}<span class="count" id="wish-count">0</span></a>
          <button class="icon-btn" data-action="show-cart" aria-haspopup="dialog" aria-label="Cart">${icon('shopping-bag')}<span class="count" id="cart-count">0</span></button>
        </div>
      </div>
      <nav class="nav-row" id="main-nav" aria-label="Main">
        <div class="container-fm flex flex-wrap items-center gap-2 lg:gap-6">
          <div class="mega-wrap">
            <button class="btn btn-secondary btn-sm" data-action="toggle-mega" aria-expanded="false" aria-controls="mega">${icon('layout-grid', 'w-4 h-4')}All Categories${icon('chevron-down', 'w-4 h-4')}</button>
            <div class="mega" id="mega" hidden>${mega}</div>
          </div>
          <a href="${r}index.html" class="nav-link">Home</a>
          <button class="nav-link" data-cat="all">Shop All</button>
          <button class="nav-link" data-cat="fruits-vegetables">Fruits &amp; Veg</button>
          <button class="nav-link" data-cat="dairy-bakery">Dairy &amp; Bakery</button>
          <button class="nav-link" data-cat="snacks">Snacks</button>
          <button class="nav-link" data-cat="beverages">Beverages</button>
          <a href="${r}pages/offers.html" class="nav-link nav-offers">Offers</a>
        </div>
      </nav>
    </header>`;
  };

  const Footer = () => {
    const r = root(), P = (f) => `${r}pages/${f}`;
    const LINKS = { 'Help Centre': P('faq.html'), 'Track Order': P('dashboard.html#orders'), 'Returns & Refunds': P('faq.html#returns'), 'Delivery Info': P('faq.html#orders'), 'About Us': P('about.html'), 'Contact': P('contact.html') };
    const soon = (t) => LINKS[t] ? `<li><a class="foot-link" href="${LINKS[t]}">${t}</a></li>` : `<li><button class="foot-link" data-action="soon" data-label="${t}">${t}</button></li>`;
    const col = (title, items) => `<div><h4>${title}</h4><ul>${items.map(soon).join('')}</ul></div>`;
    const cats = FM.categories.slice(0, 6).map(c => `<li><button class="foot-link" data-cat="${c.id}">${c.name}</button></li>`).join('');
    const social = ['facebook', 'instagram', 'twitter', 'youtube'].map(s => `<button class="social" data-action="soon" data-label="${s[0].toUpperCase() + s.slice(1)}" aria-label="${s}">${icon(s, 'w-4 h-4')}</button>`).join('');
    const pay = ['VISA', 'Mastercard', 'UPI', 'RuPay', 'COD'].map(p => `<span class="pay">${p}</span>`).join('');
    return `
    <footer class="site-footer">
      <div class="container-fm footer-grid">
        <div class="footer-brand">
          <a href="${root()}index.html" class="logo logo-light"><span class="logo-mark">${icon('leaf', 'w-5 h-5')}</span>FRESH<b>MART</b></a>
          <p>Premium groceries sourced from trusted growers and delivered fresh to your door.</p>
          <div class="flex gap-2 mt-4">${social}</div>
        </div>
        ${col('Customer Service', ['Help Centre', 'Track Order', 'Returns & Refunds', 'Delivery Info'])}
        <div><h4>Categories</h4><ul>${cats}</ul></div>
        ${col('Company', ['About Us', 'Careers', 'Our Farmers', 'Contact'])}
        <div class="footer-news">
          <h4>Fresh offers in your inbox</h4>
          <form data-newsletter="footer" novalidate>
            <div class="news-field"><input type="email" name="email" placeholder="Your email address" aria-label="Email address" required>
            <button class="btn btn-secondary btn-sm" type="submit">Subscribe</button></div>
            <p class="news-msg" aria-live="polite"></p>
          </form>
          <div class="flex flex-wrap gap-2 mt-4">${pay}</div>
        </div>
      </div>
      <div class="footer-bottom"><div class="container-fm flex flex-wrap justify-between gap-2">
        <p>© <span id="year"></span> FRESHMART. All rights reserved.</p>
        <p>Made with care for fresher kitchens.</p>
      </div></div>
    </footer>`;
  };

  const Toast = {
    show(msg, type = 'success') {
      const host = document.getElementById('toast-root'); if (!host) return;
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.innerHTML = `${icon(type === 'info' ? 'info' : 'check-circle-2', 'w-5 h-5')}<span>${msg}</span>`;
      host.appendChild(el);
      window.lucide && lucide.createIcons();
      requestAnimationFrame(() => el.classList.add('in'));
      setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, 2800);
    }
  };

  const mount = () => {
    document.querySelector('[data-component="header"]').innerHTML = Header();
    document.querySelector('[data-component="footer"]').innerHTML = Footer();
    document.getElementById('year').textContent = new Date().getFullYear();
  };

  window.FM_UI = { productUrl, Button, SectionHeading, ProductCard, CategoryTile, Testimonial, Header, Footer, Toast, icon, rupee, mount };
})();
