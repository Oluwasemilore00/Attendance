"""Stripe subscription management."""
import os

import stripe
from flask import Blueprint, jsonify, request
from sqlalchemy import text

from app.extensions import db
from app.models import Role, User
from app.utils.decorators import current_user, roles_required

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def _stripe():
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key:
        raise RuntimeError("STRIPE_SECRET_KEY not configured.")
    stripe.api_key = key
    return stripe


def _frontend_base():
    return request.headers.get("X-Frontend-URL", "http://localhost:5173")


@payments_bp.post("/create-checkout")
@roles_required(*Role.ALL)
def create_checkout():
    user = current_user()
    data = request.get_json(silent=True) or {}
    currency = (data.get("currency") or "usd").lower()

    price_id = (
        os.getenv("STRIPE_PRICE_NGN") if currency == "ngn"
        else os.getenv("STRIPE_PRICE_USD")
    )
    if not price_id:
        return jsonify({"error": f"No price configured for {currency.upper()}."}), 503

    s = _stripe()
    base = _frontend_base()
    session = s.checkout.Session.create(
        customer_email=user.email,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{base}/dashboard?payment=success&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/settings?payment=cancelled",
        metadata={"user_id": str(user.id)},
    )
    return jsonify({"url": session.url})


@payments_bp.get("/verify-session")
@roles_required(*Role.ALL)
def verify_session():
    """Called from the success redirect — upgrades user without needing the webhook."""
    session_id = request.args.get("session_id", "")
    if not session_id:
        return jsonify({"error": "Missing session_id."}), 400

    s = _stripe()
    try:
        # Do NOT expand subscription — keep it as a plain string ID
        cs = s.checkout.Session.retrieve(session_id)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    # Allow 'complete' OR 'paid' payment_status — trials use 'no_payment_required'
    if cs.status == "expired":
        return jsonify({"error": "Checkout session has expired."}), 402

    user_id = int((cs.metadata or {}).get("user_id", 0))
    user = current_user()

    if user_id and user_id != user.id:
        return jsonify({"error": "Session mismatch."}), 403

    # Must have a customer to be a real paid session
    if not cs.customer:
        return jsonify({"error": "Payment not completed."}), 402

    # Use a raw connection to guarantee the write lands regardless of
    # any stale objects in the SQLAlchemy identity map.
    with db.engine.connect() as conn:
        conn.execute(
            text(
                "UPDATE users SET plan='pro', stripe_customer_id=:cid,"
                " stripe_subscription_id=:sid WHERE id=:uid"
            ),
            {
                "cid": cs.customer or None,
                "sid": cs.subscription or None,
                "uid": user.id,
            },
        )
        conn.commit()

    # Expire the cached ORM object so the next access re-reads from DB
    db.session.expire(user)

    return jsonify({"user": user.to_dict()})


@payments_bp.post("/webhook")
def stripe_webhook():
    payload = request.get_data()
    sig = request.headers.get("Stripe-Signature", "")
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    s = _stripe()
    try:
        event = s.Webhook.construct_event(payload, sig, secret)
    except stripe.error.SignatureVerificationError:
        return jsonify({"error": "Invalid signature."}), 400
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400

    etype = event["type"]
    obj = event["data"]["object"]

    with db.engine.connect() as conn:
        if etype == "checkout.session.completed":
            user_id = int((obj.get("metadata") or {}).get("user_id", 0))
            if user_id:
                conn.execute(
                    text("UPDATE users SET plan='pro', stripe_customer_id=:cid,"
                         " stripe_subscription_id=:sid WHERE id=:uid"),
                    {"cid": obj.get("customer"), "sid": obj.get("subscription"), "uid": user_id},
                )
                conn.commit()

        elif etype == "customer.subscription.deleted":
            conn.execute(
                text("UPDATE users SET plan='free', stripe_subscription_id=NULL"
                     " WHERE stripe_subscription_id=:sid"),
                {"sid": obj.get("id")},
            )
            conn.commit()

        elif etype == "customer.subscription.updated":
            status = obj.get("status")
            if status == "active":
                new_plan = "pro"
            elif status in ("canceled", "unpaid", "incomplete_expired", "paused"):
                new_plan = "free"
            else:
                new_plan = None
            if new_plan:
                conn.execute(
                    text("UPDATE users SET plan=:plan WHERE stripe_subscription_id=:sid"),
                    {"plan": new_plan, "sid": obj.get("id")},
                )
                conn.commit()

    return jsonify({"received": True})


@payments_bp.post("/portal")
@roles_required(*Role.ALL)
def customer_portal():
    user = current_user()
    s = _stripe()

    customer_id = user.stripe_customer_id

    # If not stored, look up by email in Stripe
    if not customer_id:
        customers = s.Customer.list(email=user.email, limit=1)
        if not customers.data:
            return jsonify({"error": "No active subscription found."}), 400
        customer_id = customers.data[0].id
        # Persist it so we don't have to look it up again
        with db.engine.connect() as conn:
            conn.execute(
                text("UPDATE users SET stripe_customer_id=:cid WHERE id=:uid"),
                {"cid": customer_id, "uid": user.id},
            )
            conn.commit()

    portal = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{_frontend_base()}/settings",
    )
    return jsonify({"url": portal.url})
