const CART_KEY = 'order';

 
const sid = id => String(id);

// Cart helpers 

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartItem(id) {
  return getCart().find(item => sid(item.id) === sid(id)) || null;
}

function getTotalCartQty() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

// Stock helpers 

function getProductFromDB(id) {
  return candlesProducts.find(p => sid(p.id) === sid(id)) || null;
}

function getStockAmount(id) {
  const p = getProductFromDB(id);
  return p ? p.productAmount : 0;
}

function getCartQtyForProduct(id) {
  const item = getCartItem(id);
  return item ? item.qty : 0;
}

// Cart operations 


function addToCart(id) {
  const product = getProductFromDB(id);
  if (!product) return 'not_found';

  const stock      = product.productAmount;
  const currentQty = getCartQtyForProduct(id);

  if (stock === 0)         return 'out_of_stock';
  if (currentQty >= stock) return 'max_reached';

  const cart = getCart();
  const idx  = cart.findIndex(item => sid(item.id) === sid(id));

  if (idx !== -1) {
    cart[idx].qty += 1;
  } else {
    cart.push({
      id:    sid(product.id),
      name:  product.name,
      img:   product.img,
      alt:   product.alt,
      price: product.price,
      meta:  product.meta,   
      qty:   1,
    });
  }

  saveCart(cart);
  return idx !== -1 ? 'updated' : 'added';
}


function setCartQty(id, qty) {
  const stock   = getStockAmount(id);
  const clamped = Math.min(Math.max(0, qty), stock);
  const cart    = getCart();
  const idx     = cart.findIndex(item => sid(item.id) === sid(id));

  if (clamped === 0) {
    if (idx !== -1) cart.splice(idx, 1);
  } else if (idx !== -1) {
    cart[idx].qty = clamped;
  } else {
    const product = getProductFromDB(id);
    if (product) {
      cart.push({
        id:    sid(id),
        name:  product.name,
        img:   product.img,
        alt:   product.alt,
        price: product.price,
        meta:  product.meta,
        qty:   clamped,
      });
    }
  }

  saveCart(cart);
  return clamped;
}

function removeFromCart(id) {
  saveCart(getCart().filter(item => sid(item.id) !== sid(id)));
}

// Badge

function updateBadge() {
  const total = getTotalCartQty();
  const badge = document.getElementById('cart-badge');
  const text  = document.getElementById('cart-badge-text');
  if (!badge || !text) return;
  text.textContent = total;
  badge.classList.toggle('hidden', total === 0);
}

// Toast 

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

// Card footer renderer 

function renderCardFooter(id) {
  const footer = document.getElementById(`card-footer-${sid(id)}`);
  if (!footer) return;

  const stock = getStockAmount(id);
  const qty   = getCartQtyForProduct(id);

  if (stock === 0) {
    footer.innerHTML = `
      <button disabled class="mt-2 w-full py-3 px-4 rounded-md bg-stone-200 text-stone-400
        text-sm uppercase tracking-widest cursor-not-allowed">
        Out of Stock
      </button>`;
    return;
  }

  if (qty === 0) {
    footer.innerHTML = `
      <button onclick="handleAddToCart('${sid(id)}')"
        class="mt-2 w-full flex items-center justify-center gap-3 bg-stone-900
          hover:bg-stone-700 active:scale-[0.98] transition-all text-white text-sm
          uppercase tracking-widest py-3 px-4 rounded-md cursor-pointer">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        Add to Cart
      </button>`;
  } else {
    const atMax = qty >= stock;
    footer.innerHTML = `
      <div class="mt-2 flex items-center gap-2">
        <div class="flex items-center border border-stone-300 rounded-md overflow-hidden">
          <button onclick="handleDecrement('${sid(id)}')"
            class="w-9 h-9 flex items-center justify-center text-gray-700
              hover:bg-stone-100 active:bg-stone-200 transition-colors text-lg leading-none cursor-pointer">−</button>
          <span class="w-8 text-center text-sm font-medium text-gray-800 select-none">${qty}</span>
          <button onclick="handleIncrement('${sid(id)}')" ${atMax ? 'disabled' : ''}
            class="w-9 h-9 flex items-center justify-center transition-colors text-lg leading-none
              ${atMax ? 'text-stone-300 cursor-not-allowed' : 'text-gray-700 hover:bg-stone-100 active:bg-stone-200 cursor-pointer'}">+</button>
        </div>
        <button onclick="handleRemove('${sid(id)}')"
          class="flex-1 bg-stone-900 hover:bg-stone-700 active:scale-[0.98] transition-all
            text-white text-sm uppercase tracking-widest py-2 px-3 rounded-md cursor-pointer">
          In Cart (${qty})
        </button>
      </div>
      ${atMax ? `<p class="text-xs text-amber-600 mt-1 tracking-wide">Max stock reached (${stock})</p>` : ''}`;
  }
}

// Event handlers 

function handleAddToCart(id) {
  const result = addToCart(id);
  updateBadge();
  renderCardFooter(id);
  if      (result === 'added')        showToast('Added to cart ✓', 'success');
  else if (result === 'updated')      showToast('Quantity updated ✓', 'success');
  else if (result === 'out_of_stock') showToast('Sorry — this item is out of stock', 'error');
  else if (result === 'max_reached')  showToast(`Only ${getStockAmount(id)} in stock`, 'warning');
}

function handleIncrement(id) {
  const stock   = getStockAmount(id);
  const current = getCartQtyForProduct(id);
  if (current >= stock) { showToast(`Only ${stock} in stock`, 'warning'); return; }
  setCartQty(id, current + 1);
  updateBadge();
  renderCardFooter(id);
}

function handleDecrement(id) {
  const current = getCartQtyForProduct(id);
  setCartQty(id, current - 1);
  updateBadge();
  renderCardFooter(id);
  if (current - 1 === 0) showToast('Removed from cart', 'info');
}

function handleRemove(id) {
  removeFromCart(id);
  updateBadge();
  renderCardFooter(id);
  showToast('Removed from cart', 'info');
}

// Grid renderer 

function renderGrid() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  grid.innerHTML = candlesProducts.map(p => {
    const outOfStock = p.productAmount === 0;
    const lowStock   = p.productAmount > 0 && p.productAmount <= 5;
    return `
      <div class="product-card flex flex-col gap-1">
        <a href="product.html?id=${sid(p.id)}" class="relative bg-stone-100 rounded-lg shadow-sm overflow-hidden block">
          <img class="card-img w-full aspect-[384/340] object-cover"
               src="${p.img}" alt="${p.alt}" loading="lazy"/>
          ${outOfStock ? `<span class="absolute top-2.5 left-3 px-3 py-0.5 bg-stone-400 text-white text-sm uppercase">Out of Stock</span>` : ''}
          ${lowStock   ? `<span class="absolute top-2.5 left-3 px-3 py-0.5 bg-amber-600 text-white text-sm uppercase">Only ${p.productAmount} left</span>` : ''}
        </a>
        <a href="product.html?id=${sid(p.id)}" class="font-playfair text-base text-gray-800 mt-2 hover:text-stone-600 transition-colors">${p.name}</a>
        <p class="text-gray-600 text-sm leading-relaxed">${p.meta}</p>
        <p class="text-gray-800 text-base mt-1">$${p.price.toFixed(2)}</p>
        <div id="card-footer-${sid(p.id)}"></div>
      </div>`;
  }).join('');

  candlesProducts.forEach(p => renderCardFooter(p.id));
}

// ── Init

document.addEventListener('DOMContentLoaded', () => {
  renderGrid();
  updateBadge();

  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
  });

  document.getElementById('cart-icon-btn')?.addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
});