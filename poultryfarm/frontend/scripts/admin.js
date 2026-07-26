// admin.js - Admin dashboard backed by the Flask API + database.
// The admin password is now checked server-side (see backend/.env),
// not hardcoded in this file.

let adminProducts = [];
let allOrders = [];

async function adminApiGet(path) {
  const res = await fetch(path, { credentials: "include" });
  if (res.status === 401) {
    showAdminLogin();
    throw new Error("Not authenticated");
  }
  return res.json();
}

async function adminApiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    showAdminLogin();
    throw new Error("Not authenticated");
  }
  return res.json();
}

function showAdminLogin() {
  const loginScreen = document.getElementById("adminLoginScreen");
  const dashboard = document.getElementById("adminDashboard");
  if (loginScreen) loginScreen.style.display = "flex";
  if (dashboard) dashboard.style.display = "none";
}

async function adminLogin() {
  const password = document.getElementById("adminPassword").value;
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ password }),
  });
  const data = await res.json();

  if (res.ok) {
    document.getElementById("adminLoginScreen").style.display = "none";
    document.getElementById("adminDashboard").style.display = "block";
    loadAllDashboardData();
  } else {
    alert(data.error || "Incorrect password.");
  }
}

async function refreshDashboard() {
  await loadAllDashboardData();
}

async function adminLogout() {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
  window.location.reload();
}

async function adminQuit() {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
  window.location.href = "index.html";
}

async function loadAllDashboardData() {
  try {
    [adminProducts, allOrders] = await Promise.all([
      adminApiGet("/api/products"),
      adminApiGet("/api/admin/orders"),
    ]);
  } catch (err) {
    return;
  }
  renderStats();
  renderOrdersTable();
  renderProductsTable();
  renderCustomersTable();
  renderLowStockTable();
  renderRecentOrders();
  setupTabSwitching();
}

function renderStats() {
  const statsGrid = document.getElementById("statsGrid");
  if (!statsGrid) return;

  const today = new Date().toLocaleDateString("en-GH");
  const todayOrders = allOrders.filter(
    (o) => new Date(o.created_at).toLocaleDateString("en-GH") === today,
  );
  const totalRevenue = allOrders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockCount = adminProducts.filter((p) => p.stock < 20).length;
  const pendingOrders = allOrders.filter((o) => o.status === "Pending").length;

  statsGrid.innerHTML = `
    <div class="stat-card"><i class="fas fa-shopping-cart"></i><div class="stat-value">${todayOrders.length}</div><div class="stat-label">Orders Today</div></div>
    <div class="stat-card"><i class="fas fa-hourglass-half"></i><div class="stat-value">${pendingOrders}</div><div class="stat-label">Pending Orders</div></div>
    <div class="stat-card"><i class="fas fa-cedi-sign"></i><div class="stat-value">₵${totalRevenue.toFixed(2)}</div><div class="stat-label">Revenue (Paid)</div></div>
    <div class="stat-card"><i class="fas fa-box"></i><div class="stat-value">${adminProducts.length}</div><div class="stat-label">Products</div></div>
    <div class="stat-card"><i class="fas fa-exclamation-triangle"></i><div class="stat-value">${lowStockCount}</div><div class="stat-label">Low Stock</div></div>
  `;
}

function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  if (allOrders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No orders yet</td></tr>';
    return;
  }

  tbody.innerHTML = allOrders
    .map(
      (order) => `
    <tr>
      <td><strong>${order.order_code}</strong></td>
      <td>${order.customer_name}<br><small style="color:#666;">${order.phone}</small></td>
      <td>₵${(order.total || 0).toFixed(2)}<br><small style="color:${order.payment_status === "paid" ? "#4CAF50" : "#e74c3c"};">${order.payment_status}</small></td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${order.order_code}', this.value)">
          ${getStatusOptions(order.status)}
        </select>
      </td>
      <td>${new Date(order.created_at).toLocaleDateString("en-GH")}</td>
      <td><button class="btn-sm" onclick="viewOrderDetails('${order.order_code}')"><i class="fas fa-eye"></i> View</button></td>
    </tr>
  `,
    )
    .join("");
}

function getStatusOptions(current) {
  const statuses = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  return statuses
    .map(
      (s) =>
        `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`,
    )
    .join("");
}

async function updateOrderStatus(orderCode, newStatus) {
  const updated = await adminApiSend(
    `/api/admin/orders/${orderCode}`,
    "PATCH",
    { status: newStatus },
  );
  const idx = allOrders.findIndex((o) => o.order_code === orderCode);
  if (idx !== -1) allOrders[idx] = updated;
  renderOrdersTable();
  renderStats();
  renderRecentOrders();
  alert(`✅ Order ${orderCode} updated to ${newStatus}`);
}

function viewOrderDetails(orderCode) {
  const order = allOrders.find((o) => o.order_code === orderCode);
  if (order) {
    alert(
      `Order: ${order.order_code}\nCustomer: ${order.customer_name}\nPhone: ${order.phone}\nTotal: ₵${order.total}\nPayment: ${order.payment_status}\nStatus: ${order.status}`,
    );
  }
}

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  tbody.innerHTML = adminProducts
    .map(
      (product) => `
    <tr>
      <td><img src="${product.image || "https://via.placeholder.com/50"}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/50'"></td>
      <td><strong>${product.name}</strong><br><small style="color:#666;">${product.unit || ""}</small></td>
      <td><span class="category-badge">${product.category}</span></td>
      <td>₵${product.price}</td>
      <td class="${product.stock < 20 ? "stock-low" : ""}"><strong>${product.stock}</strong> ${product.stock < 20 ? "⚠️" : ""}</td>
      <td>
        <button class="btn-edit" onclick="editProduct(${product.id})"><i class="fas fa-edit"></i> Edit</button>
        <button class="btn-delete" onclick="deleteProduct(${product.id})"><i class="fas fa-trash"></i> Delete</button>
      </td>
    </tr>
  `,
    )
    .join("");
}

function editProduct(id) {
  const product = adminProducts.find((p) => p.id === id);
  if (product) {
    document.getElementById("modalTitle").innerText = "Edit Product";
    document.getElementById("productId").value = product.id;
    document.getElementById("prodName").value = product.name;
    document.getElementById("prodPrice").value = product.price;
    document.getElementById("prodUnit").value = product.unit || "";
    document.getElementById("prodCategory").value = product.category;
    document.getElementById("prodStock").value = product.stock;
    document.getElementById("prodImage").value = product.image || "";
    document.getElementById("productModal").style.display = "flex";
  }
}

async function deleteProduct(id) {
  if (
    confirm(
      "⚠️ Are you sure you want to delete this product?\nThis action cannot be undone.",
    )
  ) {
    await adminApiSend(`/api/admin/products/${id}`, "DELETE");
    adminProducts = adminProducts.filter((p) => p.id !== id);
    renderProductsTable();
    renderLowStockTable();
    renderStats();
    alert("✅ Product deleted successfully");
  }
}

function showProductModal() {
  document.getElementById("modalTitle").innerText = "Add New Product";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value = "";
  document.getElementById("productModal").style.display = "flex";
}

function closeProductModal() {
  document.getElementById("productModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("productForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("productId").value;
      const payload = {
        name: document.getElementById("prodName").value,
        price: parseFloat(document.getElementById("prodPrice").value),
        unit: document.getElementById("prodUnit").value,
        category: document.getElementById("prodCategory").value,
        stock: parseInt(document.getElementById("prodStock").value),
        image:
          document.getElementById("prodImage").value ||
          "https://images.unsplash.com/photo-1589923188903-eb8f7b71b8e7?w=200",
      };

      if (id) {
        const updated = await adminApiSend(
          `/api/admin/products/${id}`,
          "PUT",
          payload,
        );
        const index = adminProducts.findIndex((p) => p.id === parseInt(id));
        if (index !== -1) adminProducts[index] = updated;
        alert("✅ Product updated successfully");
      } else {
        const created = await adminApiSend(
          "/api/admin/products",
          "POST",
          payload,
        );
        adminProducts.push(created);
        alert("✅ Product added successfully");
      }

      renderProductsTable();
      renderLowStockTable();
      renderStats();
      closeProductModal();
    });
  }
});

function renderCustomersTable() {
  const customerMap = new Map();
  allOrders.forEach((order) => {
    if (!customerMap.has(order.phone)) {
      customerMap.set(order.phone, {
        name: order.customer_name,
        phone: order.phone,
        email: order.email || "",
        orders: 0,
        total: 0,
      });
    }
    const cust = customerMap.get(order.phone);
    cust.orders++;
    cust.total += order.total || 0;
  });

  const tbody = document.getElementById("customersTableBody");
  if (!tbody) return;

  if (customerMap.size === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center;">No customers yet</td></tr>';
    return;
  }

  tbody.innerHTML = Array.from(customerMap.values())
    .map(
      (c) => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td>${c.email || "—"}</td>
      <td><span class="order-count">${c.orders}</span></td>
      <td><strong>₵${c.total.toFixed(2)}</strong></td>
    </tr>
  `,
    )
    .join("");
}

function renderLowStockTable() {
  const lowStock = adminProducts.filter((p) => p.stock < 20);
  const tbody = document.getElementById("lowStockTableBody");
  if (!tbody) return;

  if (lowStock.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align: center; color: #4CAF50;">✅ No low stock items. All products have sufficient stock!</td></tr>';
    return;
  }

  tbody.innerHTML = lowStock
    .map(
      (p) => `
    <tr>
      <td><strong>${p.name}</strong></td>
      <td class="stock-low"><strong>${p.stock}</strong> units left</td>
      <td>${p.category}</td>
      <td><button class="btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-plus"></i> Restock</button></td>
    </tr>
  `,
    )
    .join("");
}

function renderRecentOrders() {
  const container = document.getElementById("recentOrdersTable");
  if (!container) return;

  const recent = [...allOrders].slice(0, 8);

  if (recent.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; padding: 40px;">No recent orders</p>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>
        ${recent
          .map(
            (o) => `
          <tr>
            <td><strong>${o.order_code}</strong></td>
            <td>${o.customer_name}</td>
            <td>₵${(o.total || 0).toFixed(2)}</td>
            <td><span class="status-badge status-${(o.status || "pending").toLowerCase()}">${o.status || "Pending"}</span></td>
            <td>${new Date(o.created_at).toLocaleDateString("en-GH")}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function setupTabSwitching() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach((tab) => {
    if (
      !tab.classList.contains("logout-btn") &&
      !tab.classList.contains("quit-btn")
    ) {
      tab.addEventListener("click", () => {
        const tabId = tab.dataset.tab;
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document
          .querySelectorAll(".admin-tab-content")
          .forEach((content) => content.classList.remove("active"));
        if (tabId === "overview")
          document.getElementById("tabOverview").classList.add("active");
        else if (tabId === "orders")
          document.getElementById("tabOrders").classList.add("active");
        else if (tabId === "products")
          document.getElementById("tabProducts").classList.add("active");
        else if (tabId === "customers")
          document.getElementById("tabCustomers").classList.add("active");
        else if (tabId === "alerts")
          document.getElementById("tabAlerts").classList.add("active");
      });
    }
  });
}

// Check whether an admin session already exists on page load
window.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("/api/admin/orders", { credentials: "include" });
  if (res.ok) {
    document.getElementById("adminLoginScreen").style.display = "none";
    document.getElementById("adminDashboard").style.display = "block";
    loadAllDashboardData();
  }
});

window.adminLogin = adminLogin;
window.adminLogout = adminLogout;
window.adminQuit = adminQuit;
window.refreshDashboard = refreshDashboard;
window.updateOrderStatus = updateOrderStatus;
window.viewOrderDetails = viewOrderDetails;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
