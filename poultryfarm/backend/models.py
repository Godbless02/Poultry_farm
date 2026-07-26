from datetime import datetime, timedelta
import bcrypt
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=True, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(255), nullable=True)
    reset_expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def check_password(self, password):
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "username": self.username,
            "email": self.email,
            "is_verified": self.is_verified,
        }


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    price = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50))
    category = db.Column(db.String(50), nullable=False)
    stock = db.Column(db.Integer, default=0)
    image = db.Column(db.String(255))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "unit": self.unit,
            "category": self.category,
            "stock": self.stock,
            "image": self.image,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    customer_name = db.Column(db.String(150), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    whatsapp = db.Column(db.String(30))
    email = db.Column(db.String(120))

    address = db.Column(db.String(255))
    town = db.Column(db.String(100))
    zone = db.Column(db.String(50))
    delivery_method = db.Column(db.String(20), default="delivery")

    payment_method = db.Column(db.String(30), default="Paystack")
    payment_status = db.Column(db.String(20), default="unpaid")  # unpaid, pending, paid, failed
    paystack_reference = db.Column(db.String(100), index=True)
    payment_amount = db.Column(db.Float, default=0)
    payment_date = db.Column(db.DateTime, nullable=True)

    subtotal = db.Column(db.Float, default=0)
    delivery_fee = db.Column(db.Float, default=0)
    discount_amount = db.Column(db.Float, default=0)
    total = db.Column(db.Float, default=0)

    status = db.Column(db.String(20), default="Pending")  # Pending, Confirmed, Shipped, Delivered, Cancelled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "order_code": self.order_code,
            "customer_name": self.customer_name,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "email": self.email,
            "address": self.address,
            "town": self.town,
            "zone": self.zone,
            "delivery_method": self.delivery_method,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "paystack_reference": self.paystack_reference,
            "payment_amount": self.payment_amount,
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "subtotal": self.subtotal,
            "delivery_fee": self.delivery_fee,
            "discount_amount": self.discount_amount,
            "total": self.total,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "items": [item.to_dict() for item in self.items],
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer)
    name = db.Column(db.String(150), nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "name": self.name,
            "price": self.price,
            "quantity": self.quantity,
        }
