// ─────────────────────────────────────────────
//  CANDORA — Cart Page Logic
//  Shared localStorage key: 'order'
//  Cart item shape: { id, name, img, alt, price, meta, qty }
// ─────────────────────────────────────────────

const TAX_RATE = 0.085;
const CART_KEY = 'order';
const sid = id => String(id);

// ── Storage helpers ───────────────────────────

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
}

// ── State ─────────────────────────────────────

let cartItems = loadCart();

// ── Formatting ────────────────────────────────

function fmt(n) {
  return '$' + n.toFixed(2);
}

// ── Divider ───────────────────────────────────

function buildDivider() {
  return `
    <div class="my-8 flex items-center gap-4">
      <div class="flex-1 h-px bg-stone-300/25"></div>
      <div class="w-1.5 h-1.5 rounded-full bg-stone-300/50"></div>
      <div class="flex-1 h-px bg-stone-300/25"></div>
    </div>`;
}

// ── Item HTML ─────────────────────────────────

function buildItemHTML(item) {
  return `
    <div class="cart-item flex items-center gap-5" data-id="${sid(item.id)}">
      <div class="w-28 h-36 sm:w-32 sm:h-40 bg-stone-100 rounded-md shadow-sm overflow-hidden flex-shrink-0">
        <img src="${item.img}" alt="${item.alt || item.name}" class="w-full h-full object-cover" />
      </div>
      <div class="flex-1 h-36 sm:h-40 py-1 flex flex-col justify-between">
        <div class="flex flex-col gap-1">
          <h2 class="font-playfair font-medium text-zinc-900 text-lg sm:text-xl leading-7">${item.name}</h2>
          <p class="font-geist text-gray-600 text-xs leading-5">${item.meta || ''}</p>
          <span class="font-geist font-semibold text-lime-500 text-xs tracking-wide">${fmt(item.price)}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center rounded-full border border-stone-300/50 px-3 py-1 gap-4">
            <button class="qty-btn decrease text-gray-600 hover:text-gray-900 leading-none text-sm" aria-label="Decrease quantity">−</button>
            <span class="qty-display font-geist text-zinc-900 text-xs leading-5 min-w-[16px] text-center">${item.qty}</span>
            <button class="qty-btn increase text-gray-600 hover:text-gray-900 leading-none text-sm" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove-btn flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <span class="font-geist text-xs leading-5">Remove</span>
          </button>
        </div>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────

function renderCart() {
  const container = document.getElementById('cart-items');
  const layout    = document.getElementById('cart-layout');
  const empty     = document.getElementById('empty-cart');
  const badge     = document.getElementById('cart-badge');
  const badgeText = document.getElementById('cart-badge-text');

  // Reload fresh from storage on every render
  cartItems = loadCart();

  if (cartItems.length === 0) {
    layout.style.display = 'none';
    empty.style.display  = 'flex';
    badge.classList.add('hidden');
    updateSummary(0, 0, 0);
    return;
  }

  layout.style.display = '';
  empty.style.display  = 'none';

  // Render items with dividers
  container.innerHTML = cartItems
    .map((item, i) => buildItemHTML(item) + (i < cartItems.length - 1 ? buildDivider() : ''))
    .join('');

  // Summary
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const tax      = subtotal * TAX_RATE;
  const total    = subtotal + tax;
  updateSummary(subtotal, tax, total);

  // Badge
  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
  if (badgeText) badgeText.textContent = totalQty;
  badge.classList.toggle('hidden', totalQty === 0);
}

function updateSummary(subtotal, tax, total) {
  document.getElementById('summary-subtotal').textContent = fmt(subtotal);
  document.getElementById('summary-tax').textContent      = fmt(tax);
  document.getElementById('summary-total').textContent    = fmt(total);
}

// ── Stock guard for cart page ─────────────────
// Reads productAmount from data.js (loaded before cart.js in cart.html)

function getStockAmount(id) {
  if (typeof candlesProducts === 'undefined') return Infinity; // graceful fallback
  const p = candlesProducts.find(p => sid(p.id) === sid(id));
  return p ? p.productAmount : Infinity;
}

// ── Event delegation ──────────────────────────

document.getElementById('cart-items').addEventListener('click', function (e) {
  const btn    = e.target.closest('button');
  if (!btn) return;

  const itemEl = btn.closest('[data-id]');
  if (!itemEl) return;

  const id  = itemEl.dataset.id;
  const idx = cartItems.findIndex(i => sid(i.id) === sid(id));
  if (idx === -1) return;

  if (btn.classList.contains('increase')) {
    const stock = getStockAmount(id);
    if (cartItems[idx].qty >= stock) {
      showCartToast(`Only ${stock} in stock`, 'warning');
      return;
    }
    cartItems[idx].qty++;

  } else if (btn.classList.contains('decrease')) {
    if (cartItems[idx].qty > 1) {
      cartItems[idx].qty--;
    } else {
      // qty would hit 0 → remove
      cartItems.splice(idx, 1);
    }

  } else if (btn.classList.contains('remove-btn') || btn.closest('.remove-btn')) {
    cartItems.splice(idx, 1);
  }

  saveCart(cartItems);
  renderCart();
});

// ── Toast (cart page) ─────────────────────────

let cartToastTimer = null;
function showCartToast(msg, type = 'info') {
  let toast = document.getElementById('cart-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'cart-toast';
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
  clearTimeout(cartToastTimer);
  cartToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2600);
}

// ── Checkout ──────────────────────────────────

document.getElementById('checkout-btn').addEventListener('click', function () {
  if (cartItems.length === 0) return;
  document.getElementById('success-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
});

document.getElementById('close-success').addEventListener('click', function () {
  clearCart();
  cartItems = [];
  document.getElementById('success-overlay').classList.remove('active');
  document.body.style.overflow = '';
  renderCart();
});

// Close on backdrop click
document.getElementById('success-overlay').addEventListener('click', function (e) {
  if (e.target === this) document.getElementById('close-success').click();
});

// ── Init ──────────────────────────────────────
renderCart();