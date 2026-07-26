// confirmation.js - Fetches the order from the database (source of truth),
// keyed by the order_code in the URL. Falls back to localStorage only if
// no order code is present (e.g. someone navigated here directly).

async function displayConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const orderCode = params.get("order");

  let orderData = null;

  if (orderCode) {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderCode)}`, {
        credentials: "include",
      });
      if (res.ok) {
        orderData = await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch order from server.", err);
    }
  }

  if (!orderData) {
    document.getElementById("confirmationContent").innerHTML = `
      <div class="confirmation-card">
        <div class="error-icon" style="font-size: 5rem; color: #e74c3c; margin-bottom: 20px;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h1>No Order Found</h1>
        <p>We couldn't find your order information.</p>
        <div class="confirmation-actions" style="margin-top: 30px;">
          <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
          <a href="cart.html" class="btn btn-outline">View Cart</a>
        </div>
      </div>
    `;
    return;
  }

  const itemsHtml = orderData.items
    .map(
      (item) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
      <span>${item.name} x ${item.quantity}</span>
      <span style="font-weight: 500;">₵${(item.price * item.quantity).toFixed(2)}</span>
    </div>
  `,
    )
    .join("");

  const orderDate = new Date(orderData.created_at);
  const dateFormatted = orderDate.toLocaleDateString("en-GH");

  const paymentStatusColor =
    orderData.payment_status === "paid"
      ? "#4CAF50"
      : orderData.payment_status === "failed"
        ? "#e74c3c"
        : "#F9A825";
  const confirmationTitle =
    orderData.payment_status === "paid"
      ? "Order Confirmed!"
      : orderData.payment_status === "failed"
        ? "Payment Needs Attention"
        : "Order Received!";
  const confirmationMessage =
    orderData.payment_status === "paid"
      ? "Your payment was verified and your order is confirmed."
      : orderData.payment_status === "failed"
        ? "We could not verify the payment. Please contact us for help."
        : "Your order has been received and is awaiting confirmation.";

  const html = `
    <div class="confirmation-card">
      <div class="success-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <h1>${confirmationTitle}</h1>
      <p>${confirmationMessage}</p>
      <p>Thank you for shopping with Nyame Nti Poultry Farm</p>

      <div class="order-details">
        <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #2E7D32;">
          <p style="font-size: 1.2rem;"><strong>Order Number:</strong> <span style="color: #2E7D32; font-size: 1.3rem;">${orderData.order_code}</span></p>
          <p><strong>Date:</strong> ${dateFormatted}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p><strong><i class="fas fa-user"></i> Customer Information</strong></p>
          <p><strong>Name:</strong> ${orderData.customer_name}</p>
          <p><strong>Phone:</strong> ${orderData.phone}</p>
          <p><strong>WhatsApp:</strong> ${orderData.whatsapp || orderData.phone}</p>
          <p><strong>Email:</strong> ${orderData.email || "Not provided"}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p><strong><i class="fas fa-map-marker-alt"></i> Delivery Information</strong></p>
          <p><strong>Method:</strong> ${orderData.delivery_method === "pickup" ? "Farm Pickup" : "Home Delivery"}</p>
          <p><strong>Address:</strong> ${orderData.address}</p>
          <p><strong>Town:</strong> ${orderData.town}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p><strong><i class="fas fa-credit-card"></i> Payment Information</strong></p>
          <p><strong>Method:</strong> ${orderData.payment_method}</p>
          <p><strong>Payment Status:</strong> <span style="color: ${paymentStatusColor}; font-weight: bold; text-transform: capitalize;">${orderData.payment_status}</span></p>
          <p><strong>Order Status:</strong> <span style="color: #F9A825; font-weight: bold;">${orderData.status}</span></p>
        </div>

        <div style="margin-bottom: 20px;">
          <p><strong><i class="fas fa-shopping-basket"></i> Items Ordered</strong></p>
          ${itemsHtml}
        </div>

        <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #2E7D32;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Subtotal:</span><span>₵${orderData.subtotal.toFixed(2)}</span>
          </div>
          ${
            orderData.discount_amount > 0
              ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #e74c3c;">
            <span>Discount:</span><span>-₵${orderData.discount_amount.toFixed(2)}</span>
          </div>`
              : ""
          }
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>Delivery Fee:</span><span>₵${orderData.delivery_fee.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #f0f0f0; font-size: 1.2rem;">
            <strong>TOTAL:</strong><strong style="color: #2E7D32;">₵${orderData.total.toFixed(2)}</strong>
          </div>
        </div>
      </div>

      ${
        orderData.payment_status !== "paid"
          ? `
      <div class="whatsapp-instruction">
        <p><strong>📱 Complete your payment:</strong></p>
        <p>If your card/mobile money payment didn't go through, you can pay on delivery or contact us on WhatsApp.</p>
        <a href="https://wa.me/233200000000?text=Hello%20Nyame%20Nti%20Poultry%2C%0A%0AOrder%20Number%3A%20${orderData.order_code}%0ACustomer%3A%20${orderData.customer_name}%0ATotal%3A%20₵${orderData.total.toFixed(2)}" class="btn btn-wa" target="_blank">
          <i class="fab fa-whatsapp"></i> Contact Us on WhatsApp
        </a>
      </div>`
          : ""
      }

      <div class="confirmation-actions">
        <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
      </div>
    </div>
  `;

  document.getElementById("confirmationContent").innerHTML = html;
}

document.addEventListener("DOMContentLoaded", displayConfirmation);

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");
if (hamburger && navMenu) {
  hamburger.onclick = () => navMenu.classList.toggle("active");
}
