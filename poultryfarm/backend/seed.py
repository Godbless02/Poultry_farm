"""
Run this once to populate the products table.
Usage: python seed.py

Note: the original products.js had duplicate ids (two products used id 4,
three used id 5). Each product below gets its own unique id since the
database enforces that automatically via autoincrement.
"""
from app import create_app
from models import db, Product

PRODUCTS = [
    {"name": "Half Tray (15 eggs)", "price": 14, "unit": "per half tray", "category": "eggs", "stock": 45, "image": "/images/eggg1.jpg"},
    {"name": "Full Tray (30 eggs)", "price": 28, "unit": "per tray", "category": "eggs", "stock": 35, "image": "/images/eggg2.jpg"},
    {"name": "Full Crate (60 eggs)", "price": 54, "unit": "per crate (2 trays)", "category": "eggs", "stock": 20, "image": "/images/egg3.jpg"},
    {"name": "Bulk Crate x5 (150 eggs)", "price": 260, "unit": "save GHS10", "category": "eggs", "stock": 8, "image": "/images/eggg3.jpg"},
    {"name": "Small Broiler (1.5-2kg)", "price": 55, "unit": "per bird", "category": "live", "stock": 25, "image": "/images/broiler-chick1.jpg"},
    {"name": "Medium Broiler (2-2.5kg)", "price": 65, "unit": "per bird", "category": "live", "stock": 18, "image": "/images/broiler1.jpg"},
    {"name": "Large Broiler (2.5-3kg)", "price": 78, "unit": "per bird", "category": "live", "stock": 16, "image": "/images/broiler2.jpg"},
    {"name": "Extra Large Broiler (3kg+)", "price": 90, "unit": "per bird", "category": "live", "stock": 8, "image": "/images/broiler4.jpg"},
    {"name": "Local Hen / Cockerel", "price": 70, "unit": "per bird", "category": "live", "stock": 14, "image": "/images/broiler6.jpg"},
    {"name": "Broiler Chicks", "price": 8.5, "unit": "per chick (min. 50)", "category": "chicks", "stock": 500, "image": "/images/broiler-chick1.jpg"},
    {"name": "Layer Chicks", "price": 9, "unit": "per chick (min. 50)", "category": "chicks", "stock": 320, "image": "/images/layer-chicks1.jpg"},
    {"name": "Chick Starter Mash 25kg", "price": 120, "unit": "per bag", "category": "feed", "stock": 40, "image": "/images/broiler-starter1.jpg"},
    {"name": "Broiler Grower 25kg", "price": 110, "unit": "per bag", "category": "feed", "stock": 36, "image": "/images/broiler-grower.jpg"},
    {"name": "Broiler Finisher 25kg", "price": 115, "unit": "per bag", "category": "feed", "stock": 32, "image": "/images/broiler-finish.jpg"},
    {"name": "Layer Mash 25kg", "price": 105, "unit": "per bag", "category": "feed", "stock": 28, "image": "/images/layer-mash.jpg"},
    {"name": "Plastic Drinker 5L", "price": 35, "unit": "each", "category": "equipment", "stock": 12, "image": "/images/drinker1.jpg"},
    {"name": "Plastic Drinker 10L", "price": 55, "unit": "each", "category": "equipment", "stock": 9, "image": "/images/drinker2.jpg"},
    {"name": "Plastic Feeder", "price": 30, "unit": "each", "category": "equipment", "stock": 15, "image": "/images/feeder1.jpg"},
    {"name": "Hanging Feeder Large", "price": 50, "unit": "each", "category": "equipment", "stock": 6, "image": "/images/feeder2.jpg"},
    {"name": "Brooding Lamp", "price": 60, "unit": "each", "category": "equipment", "stock": 5, "image": "/images/lamp1.jpg"},
]

app = create_app()
with app.app_context():
    Product.query.delete()
    for p in PRODUCTS:
        db.session.add(Product(**p))
    db.session.commit()
    print(f"Seeded {len(PRODUCTS)} products.")
