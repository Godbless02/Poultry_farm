// main.js - Homepage carousel & shared UI
(function () {
  const products = (window.products && window.products.length) ? window.products : [];

  function getCart() {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Unable to read cart from storage.', error);
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  function updateCartBadge() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const badge = document.getElementById('cartCountBadge');
    if (badge) {
      badge.innerText = total;
    }
  }

  function addToCart(product, quantity = 1) {
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);

    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      cart.push({ ...product, quantity });
    }

    saveCart(cart);
    updateCartBadge();
    window.currentCart = cart;
  }

  function renderFeaturedProducts() {
    const track = document.getElementById('carouselTrack');
    if (!track || !products.length) return;

    const featured = products.slice(0, 8);
    track.innerHTML = featured.map((p) => `
      <div class="product-card">
        <img src="${p.image}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p class="price">₵${p.price}</p>
        <small>${p.unit || ''}</small>
        <button class="btn btn-primary add-featured" data-id="${p.id}" style="margin-top: 10px; padding: 8px 15px;">Add to Cart</button>
      </div>
    `).join('');

    document.querySelectorAll('.add-featured').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const product = products.find((item) => item.id === id);
        if (product) {
          addToCart(product, 1);
          alert(`${product.name} added to cart!`);
        }
      });
    });

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    if (prevBtn && nextBtn) {
      prevBtn.onclick = () => track.scrollBy({ left: -280, behavior: 'smooth' });
      nextBtn.onclick = () => track.scrollBy({ left: 280, behavior: 'smooth' });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderFeaturedProducts();

    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.onclick = () => navMenu.classList.toggle('active');
    }

    updateCartBadge();
  });
})();