// cart.js - Complete Cart Functionality

// ========== CART DATA ==========
let cart = [];
let appliedPromo = '';

// Delivery fees
const deliveryFees = {
  wenchi: 0,
  techiman: 20,
  sunyani: 30,
  kintampo: 25,
  dormaa: 35
};

// ========== LOAD CART ==========
function loadCart() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
  } else {
    cart = [];
  }
  renderCart();
  updateCartBadge();
}

// ========== SAVE CART ==========
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}

// ========== UPDATE CART BADGE ==========
function updateCartBadge() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartCountBadge');
  if (badge) badge.innerText = total;
}

// ========== RENDER CART ITEMS ==========
function renderCart() {
  const container = document.getElementById('cartItemsContainer');
  const emptyMsg = document.getElementById('emptyCartMessage');
  const checkoutBtn = document.getElementById('checkoutRedirectBtn');
  
  if (!container) return;
  
  if (cart.length === 0) {
    container.style.display = 'none';
    emptyMsg.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'none';
    document.getElementById('cartTotals').innerHTML = '';
    return;
  }
  
  container.style.display = 'block';
  emptyMsg.style.display = 'none';
  if (checkoutBtn) checkoutBtn.style.display = 'block';
  
  // Generate cart items HTML
  let itemsHtml = '';
  for (let i = 0; i < cart.length; i++) {
    const item = cart[i];
    itemsHtml += `
      <div class="cart-item">
        <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80'">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p class="cart-item-price">₵${item.price} / ${item.unit || ''}</p>
          <div class="quantity-control">
            <button onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
            <span>${item.quantity}</span>
            <button onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
            <button class="remove-item" onclick="removeItem(${item.id})">Remove</button>
          </div>
        </div>
        <div style="font-weight: bold;">₵${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `;
  }
  container.innerHTML = itemsHtml;
  
  calculateAndDisplayTotals();
}

// ========== UPDATE QUANTITY ==========
function updateQuantity(id, newQty) {
  if (newQty <= 0) {
    removeItem(id);
    return;
  }
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = newQty;
    saveCart();
    renderCart();
  }
}

// ========== REMOVE ITEM ==========
function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
  showToast('Item removed from cart', '#e74c3c');
}

// ========== CALCULATE AND DISPLAY TOTALS ==========
function calculateAndDisplayTotals() {
  const zoneSelect = document.getElementById('deliveryZoneSelect');
  const zone = zoneSelect ? zoneSelect.value : 'wenchi';
  const promoInput = document.getElementById('promoCodeInput');
  const promo = promoInput ? promoInput.value : '';
  
  // Calculate subtotal
  let subtotal = 0;
  for (let i = 0; i < cart.length; i++) {
    subtotal += cart[i].price * cart[i].quantity;
  }
  
  // Delivery fee
  let deliveryFee = deliveryFees[zone] || 0;
  if (zone === 'wenchi' && subtotal >= 100) deliveryFee = 0;
  if (subtotal > 1000) deliveryFee = 0;
  
  // Order discount
  let discountPercent = 0;
  if (subtotal > 1000) discountPercent = 0.08;
  else if (subtotal > 600) discountPercent = 0.05;
  else if (subtotal > 300) discountPercent = 0.03;
  const orderDiscount = subtotal * discountPercent;
  
  // Promo discount
  let promoDiscount = 0;
  if (promo === 'ABASS5') {
    promoDiscount = subtotal * 0.05;
    appliedPromo = promo;
  } else {
    appliedPromo = '';
  }
  
  // Bulk feed discount
  let bulkDiscount = 0;
  for (let i = 0; i < cart.length; i++) {
    if (cart[i].category === 'feed' && cart[i].quantity >= 5) {
      bulkDiscount += 5 * cart[i].quantity;
    }
  }
  
  const totalDiscount = orderDiscount + promoDiscount + bulkDiscount;
  const total = subtotal - totalDiscount + deliveryFee;
  
  // Build totals HTML
  const totalsHtml = `
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>₵${subtotal.toFixed(2)}</span>
      </div>
      ${orderDiscount > 0 ? `
      <div class="total-row" style="color: #e74c3c;">
        <span>Discount (${discountPercent * 100}%):</span>
        <span>-₵${orderDiscount.toFixed(2)}</span>
      </div>` : ''}
      ${promoDiscount > 0 ? `
      <div class="total-row" style="color: #27ae60;">
        <span>Promo (5%):</span>
        <span>-₵${promoDiscount.toFixed(2)}</span>
      </div>` : ''}
      ${bulkDiscount > 0 ? `
      <div class="total-row" style="color: #e74c3c;">
        <span>Bulk Feed Discount:</span>
        <span>-₵${bulkDiscount.toFixed(2)}</span>
      </div>` : ''}
      <div class="total-row">
        <span>Delivery Fee:</span>
        <span>₵${deliveryFee.toFixed(2)}</span>
      </div>
      <div class="total-row total-grand">
        <span><strong>TOTAL:</strong></span>
        <span><strong>₵${total.toFixed(2)}</strong></span>
      </div>
    </div>
  `;
  
  document.getElementById('cartTotals').innerHTML = totalsHtml;
}

// ========== APPLY PROMO ==========
function applyPromo() {
  const promoInput = document.getElementById('promoCodeInput');
  const code = promoInput ? promoInput.value.trim() : '';
  
  if (code === 'ABASS5') {
    showToast('✅ Promo code applied! 5% discount added.', '#4CAF50');
    calculateAndDisplayTotals();
  } else if (code === '') {
    showToast('Please enter a promo code', '#e74c3c');
  } else {
    showToast('❌ Invalid promo code. Try ABASS5', '#e74c3c');
  }
}

// ========== PROCEED TO CHECKOUT ==========
async function proceedToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty', '#e74c3c');
    return;
  }

  // Wait for auth.js to finish checking the session before deciding.
  if (window.authReady) await window.authReady;

  if (typeof isLoggedIn === 'function' && !isLoggedIn()) {
    showToast('Please create an account or log in before checking out.', '#e74c3c');
    setTimeout(() => {
      window.location.href = 'login.html?next=' + encodeURIComponent('checkout.html');
    }, 800);
    return;
  }
  
  // Save cart and promo to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  if (appliedPromo) {
    localStorage.setItem('appliedPromo', appliedPromo);
  }
  
  // Redirect to checkout
  window.location.href = 'checkout.html';
}

// ========== SHOW TOAST MESSAGE ==========
function showToast(message, color) {
  const toast = document.createElement('div');
  toast.innerHTML = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: ${color};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
  // Apply promo button
  const applyBtn = document.getElementById('applyPromoBtn');
  if (applyBtn) {
    applyBtn.onclick = function(e) {
      e.preventDefault();
      applyPromo();
    };
  }
  
  // Checkout button
  const checkoutBtn = document.getElementById('checkoutRedirectBtn');
  if (checkoutBtn) {
    checkoutBtn.onclick = function(e) {
      e.preventDefault();
      proceedToCheckout();
    };
  }
  
  // Delivery zone change
  const zoneSelect = document.getElementById('deliveryZoneSelect');
  if (zoneSelect) {
    zoneSelect.onchange = function() {
      calculateAndDisplayTotals();
    };
  }
  
  // Promo input enter key
  const promoInput = document.getElementById('promoCodeInput');
  if (promoInput) {
    promoInput.onkeypress = function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyPromo();
      }
    };
  }
  
  // Mobile menu
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  if (hamburger) {
    hamburger.onclick = () => navMenu.classList.toggle('active');
  }
}

// ========== ANIMATION STYLES ==========
function addStyles() {
  if (!document.getElementById('cartStyles')) {
    const style = document.createElement('style');
    style.id = 'cartStyles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
}

// ========== INITIALIZE ==========
function init() {
  addStyles();
  loadCart();
  setupEventListeners();
}

// Make functions global
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.proceedToCheckout = proceedToCheckout;
window.applyPromo = applyPromo;

// Start
document.addEventListener('DOMContentLoaded', init);