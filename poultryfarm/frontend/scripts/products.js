// products.js - Using Local Images
const products = [
  // EGGS
  { id: 1, name: "Half Tray (5000 eggs)", price: 14, unit: "per half tray", category: "eggs", stock: 45, image: "images/eggg3.jpg" },

  // LIVE CHICKENS
  { id: 2, name: "large Broiler (1.5-2kg)", price: 55, unit: "per bird", category: "live", stock: 25, image: "images/broiler2.jpg" },

  // DAY-OLD CHICKS
  { id: 3, name: "Broiler Chicks (min 50)", price: 8.5, unit: "per chick", category: "chicks", stock: 500, bulkNote: "Minimum 50 chicks", image: "images/broiler-chick1.jpg" },

  // POULTRY FEED
  { id: 4, name: " Starter  25kg", price: 100, unit: "per bag", category: "feed", stock: 40, image: "images/broiler-finish.jpg" },
  { id: 4, name: "grower 25kg", price: 70, unit: "per bag", category: "feed", stock: 40, image: "images/broiler-starter1.jpg" },

  // EQUIPMENT
  { id: 5, name: "Plastic feeder 5L", price: 50, unit: "each", category: "equipment", stock: 12, image: "images/feeder2.jpg" },
  { id: 5, name: "Plastic drinker 5L", price: 60, unit: "each", category: "equipment", stock: 12, image: "images/drinker1.jpg" },
  { id: 5, name: " lamp 5L", price: 100, unit: "each", category: "equipment", stock: 12, image: "images/lamp1.jpg" },
];

// Make products available globally
if (typeof window !== 'undefined') {
  window.products = products;
}