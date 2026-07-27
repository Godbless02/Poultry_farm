# Nyame Nti Poultry Farm — Comprehensive Project Blueprint & Review

## 1. Executive Summary
**Nyame Nti Poultry Farm** is a full-stack e-commerce web application designed for selling poultry products (eggs, live birds, chicks, feed, and equipment). It pairs a static multi-page HTML/CSS/Vanilla JavaScript frontend with a Python Flask REST backend, SQLite database (via Flask-SQLAlchemy), secure authentication (bcrypt password hashing + email verification), server-side pricing recalculations, and Paystack payment gateway integration.

---

## 2. Architecture & File Structure

```
PoultryFarm-rebuilt/
├── package.json                   # Root package descriptor (Prettier dev dependency)
└── poultryfarm/
    ├── README.md                  # Project overview & quickstart guide
    ├── PROJECT_REVIEW.md          # Comprehensive architecture blueprint
    ├── backend/
    │   ├── app.py                 # Core Flask application, route registrations & helper logic
    │   ├── config.py              # Environment configuration loader (.env binding)
    │   ├── models.py              # SQLAlchemy database models (User, Product, Order, OrderItem)
    │   ├── paystack.py            # Server-side Paystack transaction init & verification API wrappers
    │   ├── pricing.py             # Server-side pricing, delivery fee, and discount calculator
    │   ├── seed.py                # Initial database seeder for product catalog
    │   ├── start.ps1              # Windows PowerShell startup helper script
    │   ├── requirements.txt       # Python package dependencies
    │   ├── .env                   # Local active environment variables (Ignored by Git)
    │   └── .env.example           # Template for required environment variables
    └── frontend/
        ├── pages/                 # HTML UI Views
        │   ├── index.html         # Homepage with hero & featured carousel
        │   ├── shop.html          # Dynamic shop catalog with category filtering
        │   ├── cart.html          # Shopping cart overview
        │   ├── checkout.html      # Delivery details & Paystack / Pay on Delivery initiation
        │   ├── confirmation.html  # Order status confirmation page
        │   ├── login.html         # Authentication (Login, Register, Forgot/Reset Password)
        │   └── admin.html         # Protected Admin Management Dashboard
        ├── scripts/               # Client-side JavaScript Controllers
        │   ├── main.js            # Shared UI handlers & homepage featured rendering
        │   ├── products.js        # Legacy product fallback definition
        │   ├── shop-script.js     # Dynamic product fetch, filtering, rendering & UI pagination
        │   ├── cart.js            # LocalStorage cart management & sync
        │   ├── checkout.js        # Form handling & payment flow trigger
        │   ├── confirmation.js    # Order status polling / confirmation display
        │   ├── auth.js            # Authentication state handling, token verify & modal controllers
        │   └── admin.js           # Admin panel operations (Orders status updates, product CRUD)
        ├── styles/                # CSS Styling
        │   ├── style.css          # Core site styles, design system & responsive layout
        │   ├── shop-style.css     # Catalog & product grid specifics
        │   └── admin-style.css    # Admin dashboard table & modal styling
        └── images/                # Product photos & branding assets
```

---

## 3. Database Schema (`models.py`)

### 3.1 `User` Model (`users` table)
- `id` (Integer, Primary Key)
- `name` (String(120), Required)
- `username` (String(80), Unique, Indexed)
- `email` (String(120), Unique, Required, Indexed)
- `password_hash` (String(255), Required) — Hashed using `bcrypt.hashpw`
- `is_verified` (Boolean, Default False)
- `verification_token` (String(255), Nullable)
- `verified_at` (DateTime, Nullable)
- `reset_token` (String(255), Nullable)
- `reset_expires_at` (DateTime, Nullable)
- `created_at` (DateTime, Default UTC now)

### 3.2 `Product` Model (`products` table)
- `id` (Integer, Primary Key, Auto-increment)
- `name` (String(150), Required)
- `price` (Float, Required)
- `unit` (String(50))
- `category` (String(50), Required) — e.g. `eggs`, `live`, `chicks`, `feed`, `equipment`
- `stock` (Integer, Default 0)
- `image` (String(255)) — Path to relative product image

### 3.3 `Order` Model (`orders` table)
- `id` (Integer, Primary Key)
- `order_code` (String(20), Unique, Required, Indexed) — Generated prefix `APF-XXXXXXXX`
- `user_id` (Integer, Foreign Key `users.id`, Nullable)
- `customer_name` (String(150), Required)
- `phone` (String(30), Required)
- `whatsapp` (String(30))
- `email` (String(120))
- `address`, `town`, `zone` (String fields for shipping)
- `delivery_method` (String(20), Default `"delivery"`)
- `payment_method` (String(30), Default `"Paystack"`)
- `payment_status` (String(20), Default `"unpaid"`) — Values: `unpaid`, `pending`, `paid`, `failed`
- `paystack_reference` (String(100), Indexed)
- `payment_amount` (Float)
- `payment_date` (DateTime)
- `subtotal`, `delivery_fee`, `discount_amount`, `total` (Float calculations)
- `status` (String(20), Default `"Pending"`) — Values: `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`
- `created_at` (DateTime, Default UTC now)
- `items` — Relationship to `OrderItem`

### 3.4 `OrderItem` Model (`order_items` table)
- `id` (Integer, Primary Key)
- `order_id` (Integer, Foreign Key `orders.id`, Required)
- `product_id` (Integer)
- `name` (String(150), Required)
- `price` (Float, Required)
- `quantity` (Integer, Required)

---

## 4. Key Business Logic & Algorithms

### 4.1 Server-Side Pricing Recalculation (`pricing.py`)
To prevent client-side cart manipulation:
1. **Delivery Fees per Zone**:
   - `wenchi`: ₵0 (Free if subtotal >= 100)
   - `techiman`: ₵20
   - `sunyani`: ₵30
   - `kintampo`: ₵25
   - `dormaa`: ₵35
   - Orders with subtotal > ₵1000 receive **Free Delivery** across all zones.
2. **Order Volume Discounts**:
   - Subtotal > ₵1000: 8% discount
   - Subtotal > ₵600: 5% discount
   - Subtotal > ₵300: 3% discount
3. **Promo Code Discount**:
   - Code `ABASS5`: 5% discount on subtotal
4. **Bulk Feed Discount**:
   - Feed items with quantity >= 5 receive a ₵5 discount per bag.

### 4.2 Security & Authentication Workflow
- **Passwords**: Hashed with `bcrypt` before storage.
- **Input Sanitation**: Sanitized using regex rules for email formatting, strong password rules (8+ chars, uppercase, lowercase, number, special char), and username restrictions.
- **Session Management**: Cookie-based HTTP-only session state.
- **Email Verification**: Verification token emailed to user on registration (or logged to console if SMTP is unconfigured).

### 4.3 Paystack Payment Gateway Integration (`paystack.py` & `app.py`)
1. Client submits cart items & delivery details to `/api/orders`.
2. Backend looks up true product prices from DB and recalculates all totals server-side.
3. If payment is Paystack:
   - Backend calls Paystack `initialize_transaction` server-side with secret key.
   - Paystack returns an authorization URL.
   - Backend saves pending order and returns `authorization_url` to frontend.
   - Frontend redirects customer to Paystack Checkout.
4. After payment:
   - Paystack redirects browser back to `/api/paystack/callback`.
   - Backend executes server-side `verify_transaction` using Paystack Secret Key.
   - Verification matches expected pesewas amount against order total.
   - On success, `payment_status` becomes `paid` and status becomes `Confirmed`.

---

## 5. API Endpoint Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public | Redirects to `/pages/index.html` |
| `GET` | `/pages/<filename>` | Public | Serves static HTML pages |
| `GET` | `/styles/<filename>` | Public | Serves CSS stylesheets |
| `GET` | `/scripts/<filename>` | Public | Serves JavaScript files |
| `GET` | `/images/<filename>` | Public | Serves image assets |
| `GET` | `/api/config` | Public | Returns public Paystack key |
| `POST` | `/api/register` | Public | Registers new user & sends verification email |
| `POST` | `/api/login` | Public | Authenticates user & sets session cookie |
| `POST` | `/api/logout` | Session | Clears session cookie |
| `GET` | `/api/me` | Session | Returns currently logged-in user details |
| `POST` | `/api/forgot-password` | Public | Sends password reset email token |
| `POST` | `/api/reset-password` | Public | Resets password with token |
| `GET` | `/api/verify-email/<token>`| Public | Validates email token & activates user |
| `GET` | `/api/products` | Public | Returns product list (supports `category`, `page`, `per_page`) |
| `POST` | `/api/orders` | Public/User | Creates order, calculates totals, initializes Paystack |
| `POST` | `/api/paystack/verify` | Public | Server-side transaction verification endpoint |
| `GET` | `/api/paystack/callback` | Public | Paystack callback target after payment completion |
| `GET` | `/api/orders/<order_code>` | Public | Retrieves specific order details by order code |
| `POST` | `/api/admin/login` | Public | Authenticates admin using `ADMIN_PASSWORD` |
| `POST` | `/api/admin/logout` | Admin | Logs out admin session |
| `GET` | `/api/admin/orders` | Admin | Lists all orders ordered by creation date |
| `PATCH` | `/api/admin/orders/<code`>| Admin | Updates order status (`Pending`, `Confirmed`, etc.) |
| `POST` | `/api/admin/products` | Admin | Adds a new product to catalog |
| `PUT` | `/api/admin/products/<id>`| Admin | Updates product details |
| `DELETE`| `/api/admin/products/<id>`| Admin | Removes product from catalog |

---

## 6. Development & Deployment Guidelines

### Environment Configuration (`.env`)
```env
SECRET_KEY=your_secure_secret_key
DATABASE_URL=sqlite:///poultry.db
APP_URL=http://127.0.0.1:5000
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
ADMIN_PASSWORD=your_admin_pass
ADMIN_EMAIL=admin@poultryfarm.com

# SMTP Email Settings (Optional)
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=user@example.com
SMTP_PASSWORD=password
MAIL_FROM=noreply@poultryfarm.com
```

### Running Locally
```powershell
# Navigate to backend
cd poultryfarm/backend

# Install Python requirements
python -m pip install -r requirements.txt

# Seed initial database products (if empty)
python seed.py

# Run application server
python app.py
```
Open `http://127.0.0.1:5000` in browser.
