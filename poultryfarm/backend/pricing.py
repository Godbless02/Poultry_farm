"""
Server-side pricing so a customer can't tamper with totals in the browser
before paying. Mirrors the original cart.js / checkout.js logic exactly.
"""

DELIVERY_FEES = {
    "wenchi": 0,
    "techiman": 20,
    "sunyani": 30,
    "kintampo": 25,
    "dormaa": 35,
}


def calculate_totals(items, zone, promo_code=""):
    """
    items: list of dicts with product_id, name, price, quantity, category
    zone: delivery zone key
    promo_code: optional promo string
    """
    subtotal = sum(item["price"] * item["quantity"] for item in items)

    delivery_fee = DELIVERY_FEES.get(zone, 0)
    if zone == "wenchi" and subtotal >= 100:
        delivery_fee = 0
    if subtotal > 1000:
        delivery_fee = 0

    if subtotal > 1000:
        discount_percent = 0.08
    elif subtotal > 600:
        discount_percent = 0.05
    elif subtotal > 300:
        discount_percent = 0.03
    else:
        discount_percent = 0
    order_discount = subtotal * discount_percent

    promo_discount = 0
    if promo_code == "ABASS5":
        promo_discount = subtotal * 0.05

    bulk_discount = 0
    for item in items:
        if item.get("category") == "feed" and item["quantity"] >= 5:
            bulk_discount += 5 * item["quantity"]

    total_discount = order_discount + promo_discount + bulk_discount
    total = subtotal - total_discount + delivery_fee

    return {
        "subtotal": round(subtotal, 2),
        "delivery_fee": round(delivery_fee, 2),
        "order_discount": round(order_discount, 2),
        "promo_discount": round(promo_discount, 2),
        "bulk_discount": round(bulk_discount, 2),
        "discount_amount": round(total_discount, 2),
        "total": round(total, 2),
    }
