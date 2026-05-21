// ─────────────────────────────────────────────
//  CANDORA — Product Detail Page Logic
//  Reads ?id= from URL, loads product from data.js
// ─────────────────────────────────────────────

const CART_KEY = 'order';
const sid = id => String(id);

// ── Cart helpers ──────────────────────────────

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function getTotalCartQty() {
  return getCart().reduce((s, i) => s + i.qty, 0);
}
function getCartQtyForProduct(id) {
  return getCart().find(i => sid(i.id) === sid(id))?.qty || 0;
}

// ── Cart operations ───────────────────────────

function addOrUpdateCart(product, qty) {
  const cart = getCart();
  const idx = cart.findIndex(i => sid(i.id) === sid(product.id));
  if (idx !== -1) {
    cart[idx].qty = qty;
  } else {
    cart.push({
      id: sid(product.id), name: product.name, img: product.img,
      alt: product.alt, price: product.price, meta: product.meta, qty,
    });
  }
  saveCart(cart);
}
function removeFromCart(id) {
  saveCart(getCart().filter(i => sid(i.id) !== sid(id)));
}

// ── Badge ─────────────────────────────────────

function updateBadge() {
  const total = getTotalCartQty();
  const badge = document.getElementById('cart-badge');
  const text  = document.getElementById('cart-badge-text');
  if (!badge) return;
  // Support both DOM shapes: badge wraps a <span#cart-badge-text>, or badge is the text node itself
  if (text) {
    text.textContent = total;
  } else {
    badge.textContent = total;
  }
  badge.classList.toggle('hidden', total === 0);
}

// ── Toast ─────────────────────────────────────

let toastTimer = null;
function showToast(msg, type = 'info') {
  let toast = document.getElementById('candora-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'candora-toast';
    toast.style.cssText = `
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);
      padding:12px 24px;border-radius:8px;font-size:14px;font-family:'Geist',sans-serif;
      letter-spacing:0.04em;z-index:9999;opacity:0;
      transition:opacity .25s ease,transform .25s ease;
      pointer-events:none;white-space:nowrap;max-width:90vw;text-align:center;
    `;
    document.body.appendChild(toast);
  }
  const styles = {
    success: 'background:#292524;color:#fff;',
    warning: 'background:#78350f;color:#fef3c7;',
    error:   'background:#7f1d1d;color:#fee2e2;',
    info:    'background:#1c1917;color:#fff;',
  };
  toast.style.cssText += styles[type] || styles.info;
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2600);
}

// ── Cart controls renderer ────────────────────
// Mirrors store.js UX: +/− directly update the cart in real time.
// "Add to Cart" is shown when qty === 0; once in cart the qty stepper
// and an "In Cart (n)" button replace it — identical pattern to store page.

let currentProduct = null;

function renderCartControls() {
  const p = currentProduct;
  if (!p) return;

  const controls = document.getElementById('cart-controls');
  const stock    = p.productAmount;
  const qty      = getCartQtyForProduct(p.id);

  // ── Out of stock ──────────────────────────────
  if (stock === 0) {
    controls.innerHTML = `
      <button disabled class="w-full sm:w-72 py-4 rounded-full bg-stone-200 text-stone-400
        font-geist text-xs uppercase tracking-widest cursor-not-allowed">
        Out of Stock
      </button>`;
    return;
  }

  // ── Not yet in cart → show "Add to Cart" button ──
  if (qty === 0) {
    controls.innerHTML = `
      <button onclick="handleAddToCart()"
        class="w-full sm:w-72 py-4 px-6 rounded-full bg-stone-900 hover:bg-stone-700
        active:scale-[0.98] transition-all text-white font-geist text-xs uppercase tracking-widest
        flex items-center justify-center gap-2.5 cursor-pointer shadow-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        Add to Cart
      </button>`;
    return;
  }

  // ── Already in cart → show stepper + "In Cart" button ──
  const atMax = qty >= stock;

  controls.innerHTML = `
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Qty stepper (mirrors store page) -->
      <div class="flex items-center rounded-full border border-stone-300/60 px-1 py-1 gap-3 bg-stone-50">
        <button onclick="handleDecrement()"
          class="qty-btn w-9 h-9 rounded-full flex items-center justify-center text-xl leading-none
          text-gray-600 hover:bg-stone-200 cursor-pointer" aria-label="Decrease">−</button>
        <span class="font-geist text-zinc-900 text-sm w-5 text-center select-none">${qty}</span>
        <button onclick="handleIncrement()" ${atMax ? 'disabled' : ''}
          class="qty-btn w-9 h-9 rounded-full flex items-center justify-center text-xl leading-none
          ${atMax ? 'text-stone-300 cursor-not-allowed' : 'text-gray-600 hover:bg-stone-200 cursor-pointer'}"
          aria-label="Increase">+</button>
      </div>

      <!-- In Cart / View Cart button -->
      <button onclick="window.location.href='cart.html'"
        class="flex-1 sm:flex-none sm:w-52 py-4 px-6 rounded-full bg-stone-900 hover:bg-stone-700
        active:scale-[0.98] transition-all text-white font-geist text-xs uppercase tracking-widest
        cursor-pointer shadow-md">
        In Cart (${qty}) — View →
      </button>
    </div>
    ${atMax ? `<p class="font-geist text-xs text-amber-600 tracking-wide mt-1">Max stock reached (${stock})</p>` : ''}`;
}

// ── Direct cart mutators (called by inline onclick) ───────────────

function handleAddToCart() {
  const p = currentProduct;
  if (!p) return;
  const stock = p.productAmount;
  const cartQty = getCartQtyForProduct(p.id);
  if (cartQty >= stock) {
    showToast(`Only ${stock} in stock`, 'warning');
    return;
  }
  addOrUpdateCart(p, cartQty + 1);
  updateBadge();
  renderCartControls();
  showToast('Added to cart ✓', 'success');
}

function handleIncrement() {
  const p = currentProduct;
  if (!p) return;
  const stock = p.productAmount;
  const cartQty = getCartQtyForProduct(p.id);
  if (cartQty >= stock) {
    showToast(`Only ${stock} in stock`, 'warning');
    return;
  }
  addOrUpdateCart(p, cartQty + 1);
  updateBadge();
  renderCartControls();
}

function handleDecrement() {
  const p = currentProduct;
  if (!p) return;
  const cartQty = getCartQtyForProduct(p.id);
  if (cartQty <= 1) {
    removeFromCart(p.id);
    updateBadge();
    renderCartControls();
    showToast('Removed from cart', 'info');
    return;
  }
  addOrUpdateCart(p, cartQty - 1);
  updateBadge();
  renderCartControls();
}

// ── Stock badge ───────────────────────────────

function renderStockBadge(p) {
  const wrap = document.getElementById('stock-badge-wrap');
  if (p.productAmount === 0) {
    wrap.innerHTML = `<span class="inline-block px-3 py-1 rounded-full bg-stone-200 text-stone-500 font-geist text-xs uppercase tracking-widest">Out of Stock</span>`;
  } else if (p.productAmount <= 5) {
    wrap.innerHTML = `<span class="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-geist text-xs uppercase tracking-widest low-stock-pulse">Only ${p.productAmount} left</span>`;
  } else {
    wrap.innerHTML = `<span class="inline-block px-3 py-1 rounded-full bg-lime-50 text-lime-700 border border-lime-200 font-geist text-xs uppercase tracking-widest">In Stock</span>`;
  }
}

// ── Related products ──────────────────────────

function renderRelated(currentId) {
  const grid = document.getElementById('related-grid');
  const others = candlesProducts.filter(p => sid(p.id) !== sid(currentId));
  // Pick up to 4 random
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 4);

  grid.innerHTML = shuffled.map(p => `
    <a href="product.html?id=${sid(p.id)}"
      class="group flex flex-col gap-2 cursor-pointer">
      <div class="rounded-lg overflow-hidden bg-stone-100 aspect-[3/4] shadow-sm">
        <img src="${p.img}" alt="${p.alt}"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy" />
      </div>
      <p class="font-playfair text-sm text-gray-800 mt-1 leading-snug">${p.name}</p>
      <p class="font-geist font-semibold text-lime-600 text-xs">$${p.price.toFixed(2)}</p>
    </a>`).join('');
}

// ── Init ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const product = candlesProducts.find(p => sid(p.id) === sid(id));

  if (!product) {
    document.getElementById('product-detail').classList.add('hidden');
    document.getElementById('not-found').classList.remove('hidden');
    return;
  }

  currentProduct = product;
  document.title = `Candora — ${product.name}`;

  // Populate DOM
  document.getElementById('breadcrumb-name').textContent = product.name;
  document.getElementById('product-img').src = product.img;
  document.getElementById('product-img').alt = product.alt || product.name;
  document.getElementById('product-name').textContent = product.name;
  document.getElementById('product-price').textContent = '$' + product.price.toFixed(2);
  document.getElementById('product-meta').textContent = product.meta;

  renderStockBadge(product);
  renderCartControls();
  renderRelated(product.id);
  updateBadge();

  // Nav
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });
  document.getElementById('cart-icon-btn')?.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
});