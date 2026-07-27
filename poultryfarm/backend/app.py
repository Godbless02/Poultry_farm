import os
import random
import re
import secrets
import smtplib
import string
from datetime import datetime, timedelta
from email.message import EmailMessage
from functools import wraps
from seed import seed_products

from flask import Flask, current_app, request, jsonify, session, send_from_directory, redirect
from flask_cors import CORS
from sqlalchemy import inspect, text

from config import Config
from models import db, User, Product, Order, OrderItem
from pricing import calculate_totals
from paystack import initialize_transaction, verify_transaction


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
PAGES_DIR = os.path.join(FRONTEND_DIR, "pages")
SCRIPTS_DIR = os.path.join(FRONTEND_DIR, "scripts")
STYLES_DIR = os.path.join(FRONTEND_DIR, "styles")
IMAGES_DIR = os.path.join(FRONTEND_DIR, "images")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, supports_credentials=True)

    with app.app_context():
        db.create_all()
        if Product.query.count() == 0:
           
            ensure_user_schema(app)
            seed_products()

    register_static_routes(app)
    register_auth_routes(app)
    register_product_routes(app)
    register_order_routes(app)
    register_admin_routes(app)

    return app


# ---------- helpers ----------

def generate_order_code():
    return "APF-" + "".join(random.choices(string.digits, k=8))


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[A-Za-z0-9._-]{3,30}$")
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")


def sanitize_input(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def is_valid_email(email):
    return bool(EMAIL_REGEX.fullmatch(email))


def is_valid_username(username):
    return bool(USERNAME_REGEX.fullmatch(username))


def is_strong_password(password):
    return bool(PASSWORD_REGEX.fullmatch(password))


def _send_mail(subject, recipient, body):
    smtp_server = current_app.config.get("SMTP_SERVER")
    if not smtp_server:
        print(f"[auth] {subject} to {recipient}:\n{body}")
        return True

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = current_app.config.get("MAIL_FROM", "noreply@poultryfarm.com")
    msg["To"] = recipient
    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_server, current_app.config.get("SMTP_PORT", 587)) as smtp:
            smtp.starttls()
            if current_app.config.get("SMTP_USERNAME") and current_app.config.get("SMTP_PASSWORD"):
                smtp.login(current_app.config["SMTP_USERNAME"], current_app.config["SMTP_PASSWORD"])
            smtp.send_message(msg)
    except Exception as exc:
        print(f"[auth] Failed to send mail to {recipient}: {exc}")
        return False

    return True


def send_verification_email(user, token):
    app_url = current_app.config.get("APP_URL", "http://127.0.0.1:5000")
    verification_url = f"{app_url}/api/verify-email/{token}"
    body = (
        f"Hi {user.name},\n\n"
        "Thanks for registering with Nyame Nti Poultry Farm. Please verify your email by visiting the link below:\n\n"
        f"{verification_url}\n\n"
        "If you did not create this account, you can ignore this message."
    )
    return _send_mail("Verify your email - Nyame Nti Poultry Farm", user.email, body)


def send_password_reset_email(user, token):
    app_url = current_app.config.get("APP_URL") or request.url_root.rstrip("/")
    reset_url = f"{app_url}/pages/login.html?reset_token={token}"
    body = (
        f"Hi {user.name},\n\n"
        "We received a request to reset your password for Nyame Nti Poultry Farm. Use the link below to choose a new password:\n\n"
        f"{reset_url}\n\n"
        "If you did not request this, you can ignore this message."
    )
    return _send_mail("Reset your password - Nyame Nti Poultry Farm", user.email, body)


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Login required"}), 401
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get("is_admin"):
            return jsonify({"error": "Admin login required"}), 401
        return f(*args, **kwargs)
    return wrapper


def ensure_user_schema(app):
    inspector = inspect(db.engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {col["name"] for col in inspector.get_columns("users")}
    changes = []
    if "username" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN username VARCHAR(80)")
    if "is_verified" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0")
    if "verification_token" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN verification_token VARCHAR(255)")
    if "verified_at" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN verified_at DATETIME")
    if "reset_token" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)")
    if "reset_expires_at" not in existing_columns:
        changes.append("ALTER TABLE users ADD COLUMN reset_expires_at DATETIME")

    for statement in changes:
        db.session.execute(text(statement))
    db.session.commit()

    # Ensure order schema includes new payment fields.
    if "orders" in inspector.get_table_names():
        order_columns = {col["name"] for col in inspector.get_columns("orders")}
        order_changes = []
        if "payment_amount" not in order_columns:
            order_changes.append("ALTER TABLE orders ADD COLUMN payment_amount FLOAT DEFAULT 0")
        if "payment_date" not in order_columns:
            order_changes.append("ALTER TABLE orders ADD COLUMN payment_date DATETIME")
        for statement in order_changes:
            db.session.execute(text(statement))
        if order_changes:
            db.session.commit()


# ---------- static / page routes ----------

def register_static_routes(app):
    @app.route("/")
    def home():
        return redirect("/pages/index.html")

    @app.route("/pages/<path:filename>")
    def serve_page(filename):
        return send_from_directory(PAGES_DIR, filename)

    @app.route("/styles/<path:filename>")
    def serve_style(filename):
        return send_from_directory(STYLES_DIR, filename)

    @app.route("/scripts/<path:filename>")
    def serve_script(filename):
        return send_from_directory(SCRIPTS_DIR, filename)

    @app.route("/images/<path:filename>")
    def serve_image(filename):
        return send_from_directory(IMAGES_DIR, filename)

    @app.route("/api/config")
    def api_config():
        # Frontend reads the PUBLIC key only. The secret key never leaves the server.
        return jsonify({"paystack_public_key": app.config["PAYSTACK_PUBLIC_KEY"]})


# ---------- auth routes ----------

def register_auth_routes(app):
    @app.route("/api/register", methods=["POST"])
    def register():
        data = request.get_json(silent=True) or {}
        name = sanitize_input(data.get("name"))
        username = sanitize_input(data.get("username"))
        email = sanitize_input(data.get("email")).lower()
        password = sanitize_input(data.get("password"))
        password_confirm = sanitize_input(data.get("password_confirm"))

        if not name or not username or not email or not password or not password_confirm:
            return jsonify({"error": "Please complete all fields."}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Please enter a valid email address."}), 400

        if not is_valid_username(username):
            return jsonify({"error": "Username must be 3-30 characters and can include letters, numbers, dots, underscores, and hyphens."}), 400

        if not is_strong_password(password):
            return jsonify({"error": "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."}), 400

        if password != password_confirm:
            return jsonify({"error": "Passwords do not match."}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "This email address is already registered. Please log in or use another email."}), 409

        if User.query.filter_by(username=username.lower()).first():
            return jsonify({"error": "Username already exists. Please choose another username."}), 409

        user = User(
            name=name,
            username=username.lower(),
            email=email
        )

        user.set_password(password)
        user.is_verified = False
        user.verification_token = secrets.token_urlsafe(32)

        db.session.add(user)

        if not send_verification_email(user, user.verification_token):
            db.session.rollback()
            return jsonify({
            "error": "Unable to send verification email. Please try again later."
            }), 500

        db.session.commit()

        return jsonify({
            "message": "Account created successfully. Please check your email to verify your account."
        }), 201
    @app.route("/api/login", methods=["POST"])
    def login():
        data = request.get_json(silent=True) or {}
        email = sanitize_input(data.get("email")).lower()
        password = sanitize_input(data.get("password"))

        if not email or not password:
            return jsonify({"error": "Please complete all fields."}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "No account found with this email."}), 401

        if not user.check_password(password):
            return jsonify({"error": "Incorrect password. Please try again."}), 401

        if not user.is_verified:
            return jsonify({"error": "Please verify your email before logging in."}), 403

        session.clear()
        session["user_id"] = user.id
        return jsonify({"message": f"Welcome back, {user.name}!", "user": user.to_dict()})

    @app.route("/api/logout", methods=["POST"])
    def logout():
        session.clear()
        return jsonify({"message": "Logged out."})

    @app.route("/api/forgot-password", methods=["POST"])
    def forgot_password():
        data = request.get_json(silent=True) or {}
        email = sanitize_input(data.get("email")).lower()

        if not email:
            return jsonify({"error": "Please enter your email address."}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "No account exists with this email address."}), 404

        user.reset_token = secrets.token_urlsafe(32)
        user.reset_expires_at = datetime.utcnow() + timedelta(minutes=30)
        db.session.commit()

        if not send_password_reset_email(user, user.reset_token):
            user.reset_token = None
            user.reset_expires_at = None
            db.session.commit()
            return jsonify({"error": "Unable to send reset email. Please try again later."}), 500

        return jsonify({"message": "Password reset link has been sent. Please check your email."})

    @app.route("/api/reset-password", methods=["POST"])
    def reset_password():
        data = request.get_json(silent=True) or {}
        token = sanitize_input(data.get("token"))
        password = sanitize_input(data.get("password"))
        password_confirm = sanitize_input(data.get("password_confirm"))

        if not token or not password or not password_confirm:
            return jsonify({"error": "Please complete all fields."}), 400

        if not is_strong_password(password):
            return jsonify({"error": "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character."}), 400

        if password != password_confirm:
            return jsonify({"error": "Passwords do not match."}), 400

        user = User.query.filter_by(reset_token=token).first()
        if not user or not user.reset_expires_at or user.reset_expires_at < datetime.utcnow():
            return jsonify({"error": "This reset link is invalid or has expired."}), 400

        user.set_password(password)
        user.reset_token = None
        user.reset_expires_at = None
        db.session.commit()
        return jsonify({"message": "Your password has been reset successfully. Please log in with your new password."})

    @app.route("/api/me")
    def me():
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"user": None})
        user = User.query.get(user_id)
        return jsonify({"user": user.to_dict() if user else None})

    @app.route("/api/verify-email/<token>")
    def verify_email(token):
        user = User.query.filter_by(verification_token=token).first()
        if not user:
            return redirect("/pages/login.html?verified=0")

        user.is_verified = True
        user.verification_token = None
        user.verified_at = datetime.utcnow()
        db.session.commit()
        return redirect("/pages/login.html?verified=1")


# ---------- product routes ----------

def register_product_routes(app):
    @app.route("/api/products")
    def list_products():
        category = request.args.get("category", "").strip().lower()
        page = request.args.get("page", type=int, default=1)
        per_page = request.args.get("per_page", type=int, default=0)

        query = Product.query
        if category and category != "all":
            query = query.filter(Product.category == category)

        if per_page > 0:
            per_page = min(per_page, 100)
            query = query.order_by(Product.id).offset((max(page, 1) - 1) * per_page).limit(per_page)

        products = query.all()
        return jsonify([p.to_dict() for p in products])


# ---------- order + payment routes ----------

def register_order_routes(app):
    @app.route("/api/orders", methods=["POST"])
    def create_order():
        """
        Creates an order and initializes Paystack payment when needed.
        Product prices are looked up from the database by product_id, never
        trusted from the client.
        """
        data = request.get_json(force=True)
        cart_items = data.get("items", [])
        if not cart_items:
            return jsonify({"error": "Cart is empty."}), 400

        resolved_items = []
        for ci in cart_items:
            product = Product.query.get(ci.get("product_id"))
            if not product:
                return jsonify({"error": f"Product {ci.get('product_id')} not found."}), 400
            qty = max(1, int(ci.get("quantity", 1)))
            resolved_items.append({
                "product_id": product.id,
                "name": product.name,
                "price": product.price,
                "quantity": qty,
                "category": product.category,
            })

        zone = data.get("zone", "wenchi")
        promo_code = data.get("promo_code", "")
        totals = calculate_totals(resolved_items, zone, promo_code)

        payment_method = data.get("payment_method", "Paystack")
        is_online_payment = payment_method != "Pay on Delivery"
        email = data.get("email", "").strip() or "customer@poultryfarm.com"

        order = Order(
            order_code=generate_order_code(),
            user_id=session.get("user_id"),
            customer_name=data.get("customer_name", "").strip(),
            phone=data.get("phone", "").strip(),
            whatsapp=data.get("whatsapp", "").strip(),
            email=email,
            address=data.get("address", "").strip(),
            town=data.get("town", "").strip(),
            zone=zone,
            delivery_method=data.get("delivery_method", "delivery"),
            payment_method=payment_method,
            payment_status="pending" if is_online_payment else "unpaid",
            payment_amount=totals["total"],
            subtotal=totals["subtotal"],
            delivery_fee=totals["delivery_fee"],
            discount_amount=totals["discount_amount"],
            total=totals["total"],
        )
        db.session.add(order)
        db.session.flush()

        for item in resolved_items:
            db.session.add(OrderItem(
                order_id=order.id,
                product_id=item["product_id"],
                name=item["name"],
                price=item["price"],
                quantity=item["quantity"],
            ))

        if is_online_payment:
            secret_key = app.config["PAYSTACK_SECRET_KEY"]
            if not secret_key:
                db.session.rollback()
                return jsonify({"error": "Payment gateway not configured on server."}), 500

            callback_url = f"{app.config.get('APP_URL', 'http://127.0.0.1:5000')}/api/paystack/callback?order_code={order.order_code}"
            init_result = initialize_transaction(order.order_code, email, int(round(order.total * 100)), callback_url, secret_key)
            if not init_result["ok"]:
                db.session.rollback()
                return jsonify({"error": init_result.get("message", "Unable to initialize payment."), "details": init_result.get("raw")} ), 500

            order.payment_status = "pending"
            db.session.commit()
            return jsonify({
                "order_code": order.order_code,
                "amount_pesewas": int(round(order.total * 100)),
                "authorization_url": init_result["authorization_url"],
            }), 201

        db.session.commit()
        return jsonify({
            "order_code": order.order_code,
            "total": order.total,
            "amount_pesewas": int(round(order.total * 100)),
            "email": email,
            "message": "Order created. Please pay on delivery when prompted.",
        }), 201

    @app.route("/api/paystack/verify", methods=["POST"])
    def paystack_verify():
        data = request.get_json(force=True)
        reference = data.get("reference")
        order_code = data.get("order_code")

        if not reference or not order_code:
            return jsonify({"error": "reference and order_code are required."}), 400

        order = Order.query.filter_by(order_code=order_code).first()
        if not order:
            return jsonify({"error": "Order not found."}), 404

        existing_reference = Order.query.filter(Order.paystack_reference == reference).first()
        if existing_reference and existing_reference.order_code != order_code:
            return jsonify({"error": "This transaction reference has already been used."}), 400

        secret_key = app.config["PAYSTACK_SECRET_KEY"]
        if not secret_key:
            return jsonify({"error": "Payment gateway not configured on server."}), 500

        result = verify_transaction(reference, secret_key)
        expected_pesewas = int(round(order.total * 100))

        if result["ok"] and result["amount"] == expected_pesewas:
            order.payment_status = "paid"
            order.status = "Confirmed"
            order.paystack_reference = reference
            order.payment_date = datetime.utcnow()
            order.payment_amount = order.total
            db.session.commit()
            return jsonify({"message": "Payment verified.", "order": order.to_dict()})

        order.payment_status = "failed"
        order.paystack_reference = reference
        db.session.commit()
        return jsonify({"error": "Payment could not be verified.", "details": result["status"]}), 400

    @app.route("/api/paystack/callback")
    def paystack_callback():
        reference = request.args.get("reference")
        order_code = request.args.get("order_code")

        if not reference or not order_code:
            return redirect(f"/pages/confirmation.html?order={order_code or ''}")

        order = Order.query.filter_by(order_code=order_code).first()
        if not order:
            return redirect(f"/pages/confirmation.html?order={order_code}")

        secret_key = app.config["PAYSTACK_SECRET_KEY"]
        if not secret_key:
            return redirect(f"/pages/confirmation.html?order={order_code}")

        result = verify_transaction(reference, secret_key)
        expected_pesewas = int(round(order.total * 100))

        if result["ok"] and result["amount"] == expected_pesewas:
            order.payment_status = "paid"
            order.status = "Confirmed"
            order.paystack_reference = reference
            order.payment_date = datetime.utcnow()
            order.payment_amount = order.total
            db.session.commit()
        else:
            order.payment_status = "failed"
            order.paystack_reference = reference
            db.session.commit()

        return redirect(f"/pages/confirmation.html?order={order.order_code}")

    @app.route("/api/orders/<order_code>")
    def get_order(order_code):
        order = Order.query.filter_by(order_code=order_code).first()
        if not order:
            return jsonify({"error": "Order not found."}), 404
        return jsonify(order.to_dict())


# ---------- admin routes ----------

def register_admin_routes(app):
    @app.route("/api/admin/login", methods=["POST"])
    def admin_login():
        data = request.get_json(force=True)
        password = (data.get("password") or "").strip()

        # Matches the original single-password admin screen. Password now
        # lives in the .env file server-side instead of hardcoded in JS.
        if password == app.config["ADMIN_PASSWORD"]:
            session["is_admin"] = True
            return jsonify({"message": "Admin login successful."})
        return jsonify({"error": "Incorrect admin password."}), 401

    @app.route("/api/admin/logout", methods=["POST"])
    def admin_logout():
        session.pop("is_admin", None)
        return jsonify({"message": "Logged out."})

    @app.route("/api/admin/orders")
    @admin_required
    def admin_list_orders():
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders])

    @app.route("/api/admin/orders/<order_code>", methods=["PATCH"])
    @admin_required
    def admin_update_order(order_code):
        order = Order.query.filter_by(order_code=order_code).first()
        if not order:
            return jsonify({"error": "Order not found."}), 404
        data = request.get_json(force=True)
        if "status" in data:
            order.status = data["status"]
        db.session.commit()
        return jsonify(order.to_dict())

    @app.route("/api/admin/products", methods=["POST"])
    @admin_required
    def admin_create_product():
        data = request.get_json(force=True)
        product = Product(
            name=data["name"],
            price=float(data["price"]),
            unit=data.get("unit", ""),
            category=data["category"],
            stock=int(data.get("stock", 0)),
            image=data.get("image", ""),
        )
        db.session.add(product)
        db.session.commit()
        return jsonify(product.to_dict()), 201

    @app.route("/api/admin/products/<int:product_id>", methods=["PUT"])
    @admin_required
    def admin_update_product(product_id):
        product = Product.query.get_or_404(product_id)
        data = request.get_json(force=True)
        product.name = data.get("name", product.name)
        product.price = float(data.get("price", product.price))
        product.unit = data.get("unit", product.unit)
        product.category = data.get("category", product.category)
        product.stock = int(data.get("stock", product.stock))
        product.image = data.get("image", product.image)
        db.session.commit()
        return jsonify(product.to_dict())

    @app.route("/api/admin/products/<int:product_id>", methods=["DELETE"])
    @admin_required
    def admin_delete_product(product_id):
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        return jsonify({"message": "Product deleted."})


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
