import requests

PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify/{reference}"
PAYSTACK_INITIALIZE_URL = "https://api.paystack.co/transaction/initialize"


def verify_transaction(reference, secret_key):
    """
    Calls Paystack's verify endpoint. This MUST happen server-side —
    never trust a 'success' message coming only from the browser,
    since that can be faked by anyone with dev tools open.

    Returns a dict: {"ok": bool, "amount": int (pesewas), "status": str, "raw": dict}
    """
    url = PAYSTACK_VERIFY_URL.format(reference=reference)
    headers = {"Authorization": f"Bearer {secret_key}"}

    response = requests.get(url, headers=headers, timeout=15)
    data = response.json()

    if not data.get("status"):
        return {"ok": False, "amount": 0, "status": "error", "raw": data}

    tx = data.get("data", {})
    paystack_status = tx.get("status")  # "success", "failed", "abandoned"

    return {
        "ok": paystack_status == "success",
        "amount": tx.get("amount", 0),  # amount is in pesewas (GHS) / kobo (NGN)
        "status": paystack_status,
        "raw": tx,
    }


def initialize_transaction(reference, email, amount_pesewas, callback_url, secret_key):
    """
    Initializes a Paystack transaction server-side and returns an
    authorization URL for the frontend to redirect the customer.
    """
    payload = {
        "reference": reference,
        "email": email,
        "amount": amount_pesewas,
        "currency": "GHS",
        "callback_url": callback_url,
    }
    headers = {
        "Authorization": f"Bearer {secret_key}",
        "Content-Type": "application/json",
    }

    response = requests.post(
        PAYSTACK_INITIALIZE_URL,
        headers=headers,
        json=payload,
        timeout=15,
    )
    data = response.json()

    if not data.get("status"):
        return {"ok": False, "status": "error", "message": data.get("message", "Could not initialize payment."), "raw": data}

    tx = data.get("data", {})
    return {
        "ok": True,
        "authorization_url": tx.get("authorization_url"),
        "access_code": tx.get("access_code"),
        "reference": tx.get("reference"),
        "raw": data,
    }
