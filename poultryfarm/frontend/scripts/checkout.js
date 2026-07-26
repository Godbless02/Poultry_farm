// checkout.js - Creates a real order in the database, then charges the
// customer through Paystack. The server (not the browser) verifies the
// payment before an order is marked "Confirmed".

let checkoutCart = [];
let checkoutTotals = {};

const deliveryFees = {
  wenchi: 0,
  techiman: 20,
  sunyani: 30,
  kintampo: 25,
  dormaa: 35,
};

async function loadCheckoutCart() {
  const savedCart = localStorage.getItem("cart");
  checkoutCart = savedCart ? JSON.parse(savedCart) : [];

  if (checkoutCart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  displayOrderSummary();
}

function displayOrderSummary() {
  let itemsHtml = "";
  for (let i = 0; i < checkoutCart.length; i++) {
    const item = checkoutCart[i];
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
        <div>
          <strong>${item.name}</strong>
          <div style="font-size: 0.85rem; color: #666;">Qty: ${item.quantity}</div>
        </div>
        <div style="font-weight: 500; color: #2E7D32;">₵${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `;
  }
  document.getElementById("checkoutItemsList").innerHTML = itemsHtml;
  updateCheckoutTotals();
}

// Client-side totals here are for DISPLAY ONLY. The backend recalculates
// everything from real database prices before charging any money.
function updateCheckoutTotals() {
  const zoneSelect = document.getElementById("deliveryZone");
  const zone = zoneSelect ? zoneSelect.value : "wenchi";
  if (!zone) return;

  let subtotal = 0;
  for (let i = 0; i < checkoutCart.length; i++) {
    subtotal += checkoutCart[i].price * checkoutCart[i].quantity;
  }

  let deliveryFee = deliveryFees[zone] || 0;
  if (zone === "wenchi" && subtotal >= 100) deliveryFee = 0;
  if (subtotal > 1000) deliveryFee = 0;

  let discountPercent = 0;
  if (subtotal > 1000) discountPercent = 0.08;
  else if (subtotal > 600) discountPercent = 0.05;
  else if (subtotal > 300) discountPercent = 0.03;
  const orderDiscount = subtotal * discountPercent;

  const savedPromo = localStorage.getItem("appliedPromo") || "";
  let promoDiscount = 0;
  if (savedPromo === "ABASS5") promoDiscount = subtotal * 0.05;

  let bulkDiscount = 0;
  for (let i = 0; i < checkoutCart.length; i++) {
    if (checkoutCart[i].category === "feed" && checkoutCart[i].quantity >= 5) {
      bulkDiscount += 5 * checkoutCart[i].quantity;
    }
  }

  const totalDiscount = orderDiscount + promoDiscount + bulkDiscount;
  const total = subtotal - totalDiscount + deliveryFee;

  checkoutTotals = {
    subtotal,
    deliveryFee,
    orderDiscount,
    promoDiscount,
    bulkDiscount,
    totalDiscount,
    total,
    discountPercent,
  };

  document.getElementById("checkoutTotals").innerHTML = `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #f0f0f0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Subtotal:</span><span>₵${subtotal.toFixed(2)}</span>
      </div>
      ${orderDiscount > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #e74c3c;"><span>Discount (${discountPercent * 100}%):</span><span>-₵${orderDiscount.toFixed(2)}</span></div>` : ""}
      ${promoDiscount > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #27ae60;"><span>Promo Discount:</span><span>-₵${promoDiscount.toFixed(2)}</span></div>` : ""}
      ${bulkDiscount > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #e74c3c;"><span>Bulk Feed Discount:</span><span>-₵${bulkDiscount.toFixed(2)}</span></div>` : ""}
      <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
        <span>Delivery Fee:</span><span>₵${deliveryFee.toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #f0f0f0; font-size: 1.2rem;">
        <strong>TOTAL:</strong><strong style="color: #2E7D32;">₵${total.toFixed(2)}</strong>
      </div>
    </div>
  `;
}

async function placeOrder(event) {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim() || phone;
  const email = document.getElementById("email").value.trim();
  const address = document.getElementById("address").value.trim();
  const town = document.getElementById("town").value.trim();
  const zone = document.getElementById("deliveryZone").value;
  const deliveryMethod = document.querySelector(
    'input[name="deliveryMethod"]:checked',
  ).value;
  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked',
  ).value;

  if (!fullName || !phone) {
    alert("Please fill in your name and phone number");
    return;
  }
  if (deliveryMethod === "delivery" && (!address || !town || !zone)) {
    alert(
      "Please fill in your delivery address, town, and select a delivery zone",
    );
    return;
  }

  const payload = {
    items: checkoutCart.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
    zone: deliveryMethod === "pickup" ? "wenchi" : zone,
    promo_code: localStorage.getItem("appliedPromo") || "",
    customer_name: fullName,
    phone,
    whatsapp,
    email,
    address:
      deliveryMethod === "pickup" ? "Farm Pickup - Wenchi-BOADAN" : address,
    town: town || "Wenchi",
    delivery_method: deliveryMethod,
    payment_method: paymentMethod,
  };

  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
  }

  let orderRes;
  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    orderRes = await res.json();
    if (!res.ok) {
      alert(orderRes.error || "Could not create order. Please try again.");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Order";
      }
      return;
    }
  } catch (err) {
    alert(
      "Network error creating order. Please check your connection and try again.",
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order";
    }
    return;
  }

  const orderCode = orderRes.order_code;

  if (paymentMethod === "Pay on Delivery") {
    finishCheckout(orderCode);
    return;
  }

  if (!orderRes.authorization_url) {
    alert(
      "Online payment is not configured yet. Please choose Pay on Delivery, or contact the shop.",
    );
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order";
    }
    return;
  }

  window.location.href = orderRes.authorization_url;
}

function finishCheckout(orderCode) {
  localStorage.setItem("cart", "[]");
  localStorage.removeItem("appliedPromo");
  window.location.href = `confirmation.html?order=${encodeURIComponent(orderCode)}`;
}

function setupCheckoutEvents() {
  const zoneSelect = document.getElementById("deliveryZone");
  if (zoneSelect) zoneSelect.addEventListener("change", updateCheckoutTotals);

  const deliveryRadios = document.querySelectorAll(
    'input[name="deliveryMethod"]',
  );
  deliveryRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      const addressField = document.getElementById("address");
      const zoneField = document.getElementById("deliveryZone");
      if (this.value === "pickup") {
        addressField.value = "Farm Pickup - Wenchi-BOADAN";
        addressField.readOnly = true;
        if (zoneField) zoneField.value = "wenchi";
        updateCheckoutTotals();
      } else {
        addressField.value = "";
        addressField.readOnly = false;
        updateCheckoutTotals();
      }
    });
  });

  const paymentRadios = document.querySelectorAll(
    'input[name="paymentMethod"]',
  );
  const momoInstructions = document.getElementById("momoInstructions");
  paymentRadios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (momoInstructions) {
        momoInstructions.style.display =
          this.value === "Pay on Delivery" ? "none" : "block";
      }
    });
  });

  const form = document.getElementById("checkoutForm");
  if (form) form.addEventListener("submit", placeOrder);

  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");
  if (hamburger) hamburger.onclick = () => navMenu.classList.toggle("active");
}

function initCheckout() {
  loadCheckoutCart();
  setupCheckoutEvents();
}

document.addEventListener("DOMContentLoaded", initCheckout);
