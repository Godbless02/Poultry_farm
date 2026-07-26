// shop-script.js - Complete Shop Functionality with Working Add to Cart

// Initialize cart from localStorage
let cart = [];
let allProducts = [];
let activeCategory = "all";
let currentProductCategory = "all";
let productLoadAbortController = null;

function loadCart() {
  const savedCart = localStorage.getItem("cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  } else {
    cart = [];
  }
  updateCartBadge();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cartCountBadge");
  if (badge) {
    badge.innerText = total;
  }
}

function createProductCard(product) {
  const stockBadge =
    product.stock != null && product.stock < 20
      ? `<div class="stock-badge">Only ${product.stock} left!</div>`
      : "";

  return `
    <div class="product-card"
      data-name="${product.name}"
      data-price="${product.price}"
      data-id="${product.id}"
      data-category="${product.category}"
    >
      <img src="${product.image || "/images/placeholder.jpg"}" alt="${product.name}" onerror="this.onerror=null;this.src='/images/placeholder.jpg';" />
      <h3>${product.name}</h3>
      <p class="price">₵${Number(product.price).toFixed(2)}</p>
      <p class="unit">${product.unit || "available now"}</p>
      ${stockBadge}
      <button class="add-to-cart-btn">Add to Cart</button>
    </div>
  `;
}

function renderProducts() {
  clearSearchNoResults();

  if (allProducts.length === 0) {
    const message =
      currentProductCategory === "all"
        ? "No products available right now. Please check back later or explore another category."
        : "No products are currently available in this category. Please try another category or view all products.";
    showCatalogStatus(message, "empty", true);
    setCatalogSectionsVisibility(false);
    return;
  }

  clearCatalogStatus();
  setCatalogSectionsVisibility(true);

  const sections = document.querySelectorAll(".category-section");

  sections.forEach((section) => {
    const category = section.getAttribute("data-category");
    const grid = section.querySelector(".products-grid");
    if (!grid) return;

    const filteredProducts = allProducts.filter(
      (product) => product.category === category,
    );
    if (filteredProducts.length === 0) {
      grid.innerHTML =
        '<p class="no-products">No products available in this category right now.</p>';
      return;
    }

    grid.innerHTML = filteredProducts.map(createProductCard).join("");
  });

  attachCartButtonEvents();
  sortProducts();
  filterProducts(activeCategory);
}

function getProductApiUrl(category) {
  const params = new URLSearchParams();
  if (category && category !== "all") {
    params.set("category", category);
  }
  return `/api/products${params.toString() ? `?${params.toString()}` : ""}`;
}

function retryLoadProducts() {
  loadProducts(currentProductCategory);
}

function clearSearchNoResults() {
  const noResultsMsg = document.getElementById("noResultsMessage");
  if (noResultsMsg) {
    noResultsMsg.remove();
  }
}

async function loadProducts(category = "all") {
  if (currentProductCategory === category && allProducts.length > 0) {
    activeCategory = category || "all";
    filterProducts(activeCategory);
    return;
  }

  currentProductCategory = category || "all";
  activeCategory = currentProductCategory;

  if (productLoadAbortController) {
    productLoadAbortController.abort();
  }
  productLoadAbortController = new AbortController();

  showCatalogStatus("Loading products, please wait...", "loading");
  setCatalogSectionsVisibility(false);
  clearSearchNoResults();

  try {
    const url = getProductApiUrl(currentProductCategory);
    const res = await fetch(url, {
      credentials: "include",
      signal: productLoadAbortController.signal,
    });
    if (!res.ok) throw new Error("Could not load products");
    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    renderProducts();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error("Unable to load products:", error);
    showCatalogStatus(
      "Unable to load products. Please check your connection and try again.",
      "error",
      true,
    );
  }
}

function addToCart(product) {
  // Check if product already exists in cart
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  showAddedMessage(product.name);

  // Also store in window for debugging
  window.currentCart = cart;
}

function showToast(message, background = "#4CAF50") {
  const toast = document.createElement("div");
  toast.innerHTML = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 20px;
    background: ${background};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    font-weight: 500;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function showAddedMessage(productName) {
  showToast(
    `<div style="display: flex; align-items: center; gap: 10px;"><i class="fas fa-check-circle" style="font-size: 1.2rem;"></i><span>${productName} added to cart!</span></div>`,
  );
}

function showCatalogStatus(message, type = "info", showAction = false) {
  const status = document.getElementById("catalogStatus");
  if (!status) return;

  status.className = `catalog-status catalog-status--${type}`;
  const icon =
    type === "loading"
      ? `<span class="catalog-loader" aria-hidden="true"></span>`
      : `<span class="catalog-status-icon" aria-hidden="true">${type === "error" ? "⚠️" : "🛒"}</span>`;

  const actionButton = showAction
    ? `<button type="button" id="catalogRetryButton" class="catalog-status-btn">${type === "error" ? "Retry" : "View all products"}</button>`
    : "";

  status.innerHTML = `
    <div class="catalog-status-content">
      ${icon}
      <div>
        <p class="catalog-status-message">${message}</p>
        ${actionButton}
      </div>
    </div>
  `;

  status.style.display = "block";

  if (showAction) {
    const retryButton = document.getElementById("catalogRetryButton");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        if (type === "error") {
          retryLoadProducts();
        } else {
          loadProducts("all");
        }
      });
    }
  }
}

function clearCatalogStatus() {
  const status = document.getElementById("catalogStatus");
  if (!status) return;
  status.textContent = "";
  status.className = "catalog-status";
  status.style.display = "none";
}

function setCatalogSectionsVisibility(visible) {
  document.querySelectorAll(".category-section").forEach((section) => {
    section.style.display = visible ? "block" : "none";
  });
}

const reviewStorageKey = "customerReviews";
const defaultReviews = [
  {
    name: "Adwoa Mensah",
    rating: 5,
    text: "Best eggs in Wenchi! Always fresh and fast delivery.",
  },
  {
    name: "Kwame Asare",
    rating: 5,
    text: "I buy broilers regularly, healthy birds and fair price.",
  },
  {
    name: "Mr. Osei",
    rating: 4,
    text: "Their day-old chicks survived very well, highly recommend.",
  },
];

function getStoredReviews() {
  const raw = localStorage.getItem(reviewStorageKey);
  if (!raw) {
    localStorage.setItem(reviewStorageKey, JSON.stringify(defaultReviews));
    return defaultReviews.slice();
  }

  try {
    const reviews = JSON.parse(raw);
    return Array.isArray(reviews) ? reviews : defaultReviews.slice();
  } catch (error) {
    console.warn("Unable to parse stored reviews, resetting defaults.", error);
    localStorage.setItem(reviewStorageKey, JSON.stringify(defaultReviews));
    return defaultReviews.slice();
  }
}

function saveReviews(reviews) {
  localStorage.setItem(reviewStorageKey, JSON.stringify(reviews));
}

function renderStars(rating) {
  return "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);
}

function renderReviews() {
  const reviewsGrid = document.getElementById("reviewsGrid");
  if (!reviewsGrid) return;

  const reviews = getStoredReviews();
  if (reviews.length === 0) {
    reviewsGrid.innerHTML =
      '<p class="no-reviews">No reviews yet. Be the first to share your experience!</p>';
    return;
  }

  reviewsGrid.innerHTML = reviews
    .map(
      (review) => `
    <div class="review-card">
      <div class="review-header">
        <h4>${review.name}</h4>
        <div class="review-rating">${renderStars(review.rating)}</div>
      </div>
      <p>${review.text}</p>
    </div>
  `,
    )
    .join("");
}

function handleReviewSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("reviewerName");
  const ratingSelect = document.getElementById("reviewRating");
  const textInput = document.getElementById("reviewText");

  if (!nameInput || !ratingSelect || !textInput) return;

  const name = nameInput.value.trim();
  const rating = parseInt(ratingSelect.value, 10);
  const text = textInput.value.trim();

  if (!name || !text || !rating) {
    showToast("Please fill in all review fields.", "#e74c3c");
    return;
  }

  const reviews = getStoredReviews();
  reviews.unshift({ name, rating, text });
  saveReviews(reviews);
  renderReviews();

  nameInput.value = "";
  ratingSelect.value = "5";
  textInput.value = "";

  showToast("Thank you! Your review is now visible.", "#2E7D32");
}

// Handle Add to Cart button click
function handleAddToCart(event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  const productCard = button.closest(".product-card");

  if (!productCard) {
    console.error("Product card not found");
    return;
  }

  // Get product data from data attributes
  const product = {
    id: parseInt(productCard.getAttribute("data-id")),
    name: productCard.getAttribute("data-name"),
    price: parseFloat(productCard.getAttribute("data-price")),
    category: productCard.getAttribute("data-category"),
    image: productCard.querySelector("img")?.src || "",
    unit: productCard.querySelector(".unit")?.innerText || "",
    quantity: 1,
  };

  console.log("Adding to cart:", product);
  addToCart(product);

  // Visual feedback on button
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Added!';
  button.style.background = "#4CAF50";

  setTimeout(() => {
    button.innerHTML = originalText;
    button.style.background = "#2E7D32";
  }, 1000);
}

// Attach event listeners to all Add to Cart buttons
function attachCartButtonEvents() {
  const buttons = document.querySelectorAll(".add-to-cart-btn");
  console.log("Found buttons:", buttons.length);

  buttons.forEach((button) => {
    // Remove existing listener to avoid duplicates
    button.removeEventListener("click", handleAddToCart);
    // Add new listener
    button.addEventListener("click", handleAddToCart);
  });
}

// Filter products by category
function filterProducts(category) {
  activeCategory = category;
  const sections = document.querySelectorAll(".category-section");

  if (category === "all") {
    sections.forEach((section) => {
      section.style.display = "block";
    });
  } else {
    sections.forEach((section) => {
      if (section.getAttribute("data-category") === category) {
        section.style.display = "block";
      } else {
        section.style.display = "none";
      }
    });
  }
}

// Search products
function searchProducts() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const allProducts = document.querySelectorAll(".product-card");
  let hasResults = false;

  allProducts.forEach((product) => {
    const productName = product.getAttribute("data-name").toLowerCase();
    if (productName.includes(searchTerm)) {
      product.style.display = "block";
      hasResults = true;
      // Show parent category section
      const section = product.closest(".category-section");
      if (section) section.style.display = "block";
    } else {
      product.style.display = "none";
    }
  });

  // Hide empty category sections
  const sections = document.querySelectorAll(".category-section");
  sections.forEach((section) => {
    const visibleProducts = section.querySelectorAll(
      '.product-card[style="display: block"]',
    );
    if (visibleProducts.length === 0 && searchTerm !== "") {
      section.style.display = "none";
    } else if (searchTerm === "") {
      section.style.display = "block";
      section
        .querySelectorAll(".product-card")
        .forEach((p) => (p.style.display = "block"));
    }
  });

  // Show no results message
  const noResultsMsg = document.getElementById("noResultsMessage");
  if (!hasResults && searchTerm !== "") {
    if (!noResultsMsg) {
      const msg = document.createElement("div");
      msg.id = "noResultsMessage";
      msg.className = "no-results";
      msg.innerHTML = `<i class="fas fa-search"></i><p>No products found for "${searchTerm}"</p>`;
      document
        .querySelector(".products-grid:first-child")
        .parentNode.insertBefore(
          msg,
          document.querySelector(".category-section"),
        );
    }
  } else if (noResultsMsg) {
    noResultsMsg.remove();
  }
}

// Sort products by price
function sortProducts() {
  const sortValue = document.getElementById("sortSelect").value;
  const sections = document.querySelectorAll(".category-section");

  sections.forEach((section) => {
    const grid = section.querySelector(".products-grid");
    if (!grid) return;

    const products = Array.from(grid.querySelectorAll(".product-card"));

    if (sortValue === "price-low") {
      products.sort((a, b) => {
        const priceA = parseFloat(a.getAttribute("data-price"));
        const priceB = parseFloat(b.getAttribute("data-price"));
        return priceA - priceB;
      });
    } else if (sortValue === "price-high") {
      products.sort((a, b) => {
        const priceA = parseFloat(a.getAttribute("data-price"));
        const priceB = parseFloat(b.getAttribute("data-price"));
        return priceB - priceA;
      });
    } else {
      // Default order - keep original
      return;
    }

    // Reorder products
    products.forEach((product) => grid.appendChild(product));
  });

  // Re-attach button events after reordering
  attachCartButtonEvents();
}

// Add animation styles
function addAnimationStyles() {
  if (!document.getElementById("shopAnimationStyles")) {
    const style = document.createElement("style");
    style.id = "shopAnimationStyles";
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      .no-results {
        text-align: center;
        padding: 60px;
        background: white;
        border-radius: 20px;
        margin: 40px 0;
      }
      .no-results i {
        font-size: 3rem;
        color: #ccc;
        margin-bottom: 15px;
      }
      .no-results p {
        font-size: 1.2rem;
        color: #666;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize shop page
function initShop() {
  console.log("Initializing shop page...");
  loadCart();
  addAnimationStyles();
  loadProducts();

  // Set up filter button event listeners
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      filterBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const category = this.getAttribute("data-category");
      loadProducts(category);
    });
  });

  // Set up search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", searchProducts);
  }

  // Set up sort select
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", sortProducts);
  }

  const reviewForm = document.getElementById("reviewForm");
  if (reviewForm) {
    reviewForm.addEventListener("submit", handleReviewSubmit);
  }

  renderReviews();

  // Mobile menu toggle
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  console.log("Shop initialized. Cart:", cart);
}

// Run when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShop);
} else {
  initShop();
}
