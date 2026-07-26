# Nyame Nti Poultry Farm — E-commerce Site

This project is a Flask-backed online store for poultry products with a static frontend and Paystack payment integration.

## Project overview

- Backend: Flask, Flask-SQLAlchemy, SQLite, bcrypt, requests
- Frontend: static HTML, CSS, and vanilla JavaScript
- Payments: Paystack checkout with server-side initialization and verification
- Authentication: email/password registration, login, sessions, email verification, password reset
- Admin dashboard: protected by an environment password and backed by the real database

## Folder structure

```
poultryfarm/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── models.py
│   ├── paystack.py
│   ├── pricing.py
│   ├── requirements.txt
│   ├── seed.py
│   └── .env.example
├── frontend/
│   ├── pages/
│   ├── scripts/
│   ├── styles/
│   └── images/
└── README.md
```

## What changed from the original

- Passwords are hashed securely server-side using bcrypt.
- Registration blocks duplicate email and duplicate username values.
- Orders and products are stored in a real shared database instead of per-browser localStorage.
- Backend validates product IDs and recalculates all totals before charging.
- Paystack initialization happens server-side, and each transaction is verified server-side before marking an order paid.
- `checkout.html` now redirects to Paystack Checkout using an authorization URL from the backend.
- The frontend no longer trusts client-side payment success flags.

## Paystack setup

1. Create a Paystack account and enable test mode.
2. Copy your `PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY` from the Paystack dashboard.
3. Use the test credentials while developing.
4. Set `APP_URL` to the root URL where your app is served, e.g. `http://127.0.0.1:5000`.
5. Configure `PAYSTACK_URL` callbacks in Paystack if needed, but this app already sends the callback URL during initialization.

## Setup instructions

```bash
cd poultryfarm/backend
python -m pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and fill in your values.

### Required environment variables

- `SECRET_KEY` — random Flask secret key
- `DATABASE_URL` — e.g. `sqlite:///poultry.db`
- `APP_URL` — e.g. `http://127.0.0.1:5000`
- `PAYSTACK_PUBLIC_KEY` — Paystack test/public key
- `PAYSTACK_SECRET_KEY` — Paystack test/secret key
- `ADMIN_PASSWORD` — admin dashboard password

### Optional email verification variables

- `SMTP_SERVER`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `MAIL_FROM`

If SMTP is not configured, the app will print verification/reset email contents to the backend console.

## Database setup

Seed the initial products table once:

```bash
python seed.py
```

Then run the server:

```bash
py app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Testing Paystack payments locally

- Ensure `backend/.env` contains Paystack test keys.
- Place an order through the checkout page.
- The backend will create an order and return a Paystack authorization URL.
- The user is redirected to Paystack Checkout.
- Paystack returns the user to the backend callback endpoint after payment.
- The backend verifies the transaction with Paystack using the secret key.
- If verification succeeds, the order status is updated to `paid` and `Confirmed`.

## Verification and current status

- The shop catalog is now rendered dynamically from `/api/products` instead of hardcoded HTML.
- Product loading includes a spinner, retry button, error state, and dedicated empty-state messaging.
- Paystack initialization and transaction verification occur server-side, keeping the secret key hidden.
- Local verification tests passed for:
  - product fetch API
  - login/register flows
  - Paystack order creation, callback handling, and duplicate callback safety
  - Pay on Delivery order creation

### Run locally for a live check

```bash
cd poultryfarm/backend
python -m pip install -r requirements.txt
copy .env.example .env
# edit .env and fill in keys, then run:
python app.py
```

Open `http://127.0.0.1:5000` in your browser and confirm the shop page loads products, the cart works, and checkout initiates correctly.

## Common troubleshooting

- If checkout fails with "Payment gateway not configured on server," verify `PAYSTACK_SECRET_KEY` in `.env`.
- If `Product not found` appears, the frontend product IDs may not match the database and `shop.html` should be updated to use `/api/products`.
- If email verification links do not send, configure SMTP or review printed email contents in the console.
- If sessions do not persist, ensure the browser accepts cookies and `SECRET_KEY` is set.

## Deployment notes

- Use production Paystack keys in a secure environment.
- Do not commit `.env` or real API keys.
- For production, use `gunicorn app:app` or a WSGI server.
- SQLite is fine for demo use, but switch `DATABASE_URL` to PostgreSQL or another managed database for real deployments.

## Admin dashboard

Visit `/pages/admin.html`, then log in with the `ADMIN_PASSWORD` from `backend/.env`.
