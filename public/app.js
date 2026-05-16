// ════════════════════════════════════════════════════════
// KIKS.EXE — Frontend JS
// Storage keys: kiks_token, kiks_user, kiks_guest_cart,
//               kiks_wish, kiks_promo
// ════════════════════════════════════════════════════════

// ── API Client ───────────────────────────────────────────
const API = {
  get token() { return localStorage.getItem('kiks_token'); },
  get user()  {
    try { return JSON.parse(localStorage.getItem('kiks_user')); }
    catch { return null; }
  },
  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  },
  async request(method, url, data) {
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: data ? JSON.stringify(data) : undefined,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json;
  },
  get:    (url)       => API.request('GET',    url),
  post:   (url, data) => API.request('POST',   url, data),
  put:    (url, data) => API.request('PUT',    url, data),
  delete: (url)       => API.request('DELETE', url),
};

// ── Auth ─────────────────────────────────────────────────
const Auth = {
  isLoggedIn() { return !!API.token && !!API.user; },
  isAdmin()    { return this.isLoggedIn() && API.user?.isAdmin; },
  setSession(token, user) {
    localStorage.setItem('kiks_token', token);
    localStorage.setItem('kiks_user',  JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('kiks_token');
    localStorage.removeItem('kiks_user');
    GuestCart.clear();
  },
  getUser() { return API.user; },
};

// ── Guest Cart ───────────────────────────────────────────
const GuestCart = {
  KEY: 'kiks_guest_cart',
  get()       { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; } },
  save(cart)  { localStorage.setItem(this.KEY, JSON.stringify(cart)); },
  clear()     { localStorage.removeItem(this.KEY); },
  add(product, size, qty = 1) {
    const cart = this.get();
    const key  = `${product._id}_${size}`;
    const ex   = cart.find(i => i._key === key);
    if (ex) ex.qty = Math.min(10, ex.qty + qty);
    else cart.push({
      _key: key, product: product._id,
      name: product.name, price: product.price,
      art: product.art, imageUrl: product.imageUrl || '',
      category: product.category, size, qty,
    });
    this.save(cart);
  },
  remove(key)        { this.save(this.get().filter(i => i._key !== key)); },
  updateQty(key, qty) {
    const cart = this.get();
    const item = cart.find(i => i._key === key);
    if (item) item.qty = Math.max(1, Math.min(10, qty));
    this.save(cart);
  },
  total() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
};

// ── Server Cart ──────────────────────────────────────────
const Cart = {
  async get() {
    if (!Auth.isLoggedIn())
      return { items: GuestCart.get(), total: GuestCart.total(), count: GuestCart.count() };
    return await API.get('/api/cart');
  },
  async add(productId, size, qty = 1, productObj = null) {
    if (!Auth.isLoggedIn()) {
      if (!productObj) { showToast('Please log in to add to cart', 'error'); return; }
      GuestCart.add(productObj, size, qty);
      updateCartCount();
      showToast(`Added — ${productObj.name}`);
      return true;
    }
    const data = await API.post('/api/cart/add', { productId, size, qty });
    updateCartCount(data.count);
    showToast('Added to bag');
    return data;
  },
  async remove(itemId) {
    if (!Auth.isLoggedIn()) { GuestCart.remove(itemId); updateCartCount(); return; }
    return await API.delete(`/api/cart/${itemId}`);
  },
  async updateQty(itemId, qty) {
    if (!Auth.isLoggedIn()) { GuestCart.updateQty(itemId, qty); updateCartCount(); return; }
    return await API.put(`/api/cart/${itemId}`, { qty });
  },
  async clear() {
    if (!Auth.isLoggedIn()) { GuestCart.clear(); updateCartCount(); return; }
    return await API.delete('/api/cart');
  },
};

// ── Toast ─────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  const msgEl = t.querySelector('.toast-msg');
  if (msgEl) msgEl.textContent = msg;
  else t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── Cart Count ────────────────────────────────────────────
function updateCartCount(countOverride) {
  const count = countOverride !== undefined
    ? countOverride
    : (Auth.isLoggedIn() ? null : GuestCart.count());
  document.querySelectorAll('.cart-count').forEach(el => {
    if (count !== null) el.textContent = count;
  });
  if (Auth.isLoggedIn() && countOverride === undefined) {
    API.get('/api/cart')
      .then(d => document.querySelectorAll('.cart-count').forEach(el => el.textContent = d.count || 0))
      .catch(() => {});
  }
}
// Alias
function updateCartBadge(n) { updateCartCount(n); }

// ── Utilities ─────────────────────────────────────────────
function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

function renderStars(rating) {
  const r    = Math.round(rating * 2) / 2;
  const full = Math.floor(r);
  let s = '★'.repeat(full);
  if (r % 1 !== 0) s += '½';
  return s || '☆☆☆☆☆';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

function setNavActive() {
  const path   = window.location.pathname.split('/').pop() || '/';
  const search = window.location.search; // e.g. '?category=Sneakers'

  document.querySelectorAll('.nav-links .nav-link').forEach(a => {
    a.classList.remove('active');
    const href    = a.getAttribute('href') || '';
    const hpath   = href.split('?')[0].split('/').pop() || '/';
    const hquery  = href.includes('?') ? '?' + href.split('?')[1] : '';

    if (hpath !== path) return; // wrong page — skip

    if (hquery) {
      // Category/filter link — only active when URL matches exactly
      if (search === hquery) a.classList.add('active');
    } else {
      // Plain page link — active when on the page with no matching category link
      const anyQueryMatch = Array.from(
        document.querySelectorAll('.nav-links .nav-link')
      ).some(b => {
        const bq = b.getAttribute('href')?.includes('?')
          ? '?' + b.getAttribute('href').split('?')[1] : '';
        return bq && search === bq;
      });
      if (!anyQueryMatch) a.classList.add('active');
    }
  });
}

// ── Wishlist ──────────────────────────────────────────────
const WishList = {
  KEY: 'kiks_wish',
  get()    { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { return []; } },
  toggle(id) {
    let w = this.get();
    if (w.includes(id)) { w = w.filter(x => x !== id); showToast('Removed from wishlist'); }
    else { w.push(id); showToast('Added to wishlist ♥'); }
    localStorage.setItem(this.KEY, JSON.stringify(w));
    return w.includes(id);
  },
  has(id)  { return this.get().includes(id); },
};

// ── Product Card Renderer ─────────────────────────────────
window._productCache = {};

function renderProductCard(p) {
  window._productCache[p._id] = p;
  const isWished = WishList.has(p._id);
  const mid      = p.sizes ? p.sizes[Math.floor(p.sizes.length / 2)] : 'M';
  const oos      = p.stock < 1;

  const imgMarkup = p.imageUrl
    ? `<img class="p-photo" src="${p.imageUrl}" alt="${p.name}" loading="lazy">
       <div class="p-photo-overlay"></div>`
    : `<div class="p-art ${p.art || 'art-1'}">
         <span class="p-art-label">${(p.name || '').split(' ').pop().toUpperCase()}</span>
       </div>`;

  return `
  <div class="product-card" onclick="location.href='product.html?id=${p._id}'">
    <div class="product-img">
      ${p.badge && !oos ? `<span class="product-badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
      ${oos ? `<span class="product-badge" style="background:var(--muted2);color:var(--muted)">Sold Out</span>` : ''}
      <button class="wishlist-btn ${isWished ? 'active' : ''}" data-pid="${p._id}"
        onclick="event.stopPropagation();toggleWish(this,'${p._id}')">${isWished ? '♥' : '♡'}</button>
      ${imgMarkup}
      <div class="product-overlay">
        ${oos
          ? `<span style="width:100%;background:rgba(6,6,15,0.8);color:var(--muted);padding:10px;text-align:center;font-family:var(--font-head);font-size:13px;letter-spacing:0.15em;display:block">SOLD OUT</span>`
          : `<button class="add-to-cart-btn" onclick="event.stopPropagation();quickAdd('${p._id}','${mid}')">ADD TO BAG</button>`
        }
        <a href="product.html?id=${p._id}" class="quick-view-btn" onclick="event.stopPropagation()">QUICK VIEW →</a>
      </div>
    </div>
    <div class="product-info">
      <p class="product-category">${p.category}</p>
      <p class="product-name">${p.name}</p>
      <div class="product-bottom">
        <span class="product-price" style="${oos ? 'color:var(--muted)' : ''}">
          <span class="currency">₹</span>${p.price.toLocaleString('en-IN')}
          ${p.originalPrice ? `<span class="original">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
        </span>
        <span class="product-rating"><span class="stars">${renderStars(p.rating)}</span> ${p.rating}</span>
      </div>
    </div>
  </div>`;
}

function toggleWish(btn, id) {
  const active = WishList.toggle(id);
  btn.textContent = active ? '♥' : '♡';
  btn.classList.toggle('active', active);
}

async function quickAdd(productId, size) {
  try {
    const p = window._productCache[productId];
    if (!p) { showToast('Product not found', 'error'); return; }
    await Cart.add(productId, size, 1, p);
  } catch (err) {
    showToast(err.message || 'Failed to add', 'error');
  }
}

// ── Search ────────────────────────────────────────────────
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  if (!bar) return;
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) {
    const inp = document.getElementById('search-input');
    if (inp) inp.focus();
  }
}
function doSearch() {
  const inp = document.getElementById('search-input');
  const q   = inp ? inp.value.trim() : '';
  if (q) location.href = `shop.html?search=${encodeURIComponent(q)}`;
}

// ── Mobile Nav ────────────────────────────────────────────
function openMobileNav() {
  const d = document.getElementById('mobile-drawer');
  if (d) { d.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeMobileNav() {
  const d = document.getElementById('mobile-drawer');
  if (d) { d.classList.remove('open'); document.body.style.overflow = ''; }
}

// ── DOMContentLoaded ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setNavActive();
  updateCartCount();
});