import { useState } from "react";
import { X, Zap, Check, Lock } from "lucide-react";
import api from "../api/client";

const FREE_FEATURES = ["1 course", "1 session total"];
const PRO_FEATURES = [
  "Unlimited courses",
  "Unlimited sessions",
  "GPS-verified attendance",
  "Real-time analytics",
  "Exam eligibility reports",
  "QR code attendance links",
];

export default function PaymentModal({ onClose }) {
  const [currency, setCurrency] = useState("ngn");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const price = currency === "ngn" ? "₦3,000 / month" : "$3 / month";

  const subscribe = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await api.post("/api/payments/create-checkout", { currency });
      window.location.href = res.data.url;
    } catch (e) {
      setErr(e.response?.data?.error || "Could not start checkout. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="payment-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="payment-modal">
        {/* Header */}
        <div className="payment-modal-header">
          <div className="payment-modal-icon"><Zap size={22} /></div>
          <div>
            <div className="payment-modal-title">Upgrade to Pro</div>
            <div className="payment-modal-sub">You've used your free tier — unlock the full platform</div>
          </div>
          <button className="payment-modal-close" onClick={onClose} title="Dismiss"><X size={18} /></button>
        </div>

        {/* Plan comparison */}
        <div className="payment-plans">
          <div className="payment-plan free">
            <div className="payment-plan-name">Free</div>
            <div className="payment-plan-price">₦0</div>
            <ul className="payment-plan-features">
              {FREE_FEATURES.map((f) => (
                <li key={f}><Check size={13} className="check-ok" /> {f}</li>
              ))}
            </ul>
          </div>

          <div className="payment-plan pro">
            <div className="payment-plan-badge">Current offer</div>
            <div className="payment-plan-name">Pro</div>
            <div className="payment-plan-price">{price}</div>
            <ul className="payment-plan-features">
              {PRO_FEATURES.map((f) => (
                <li key={f}><Check size={13} className="check-ok" /> {f}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Currency toggle */}
        <div className="payment-currency-row">
          <span style={{ fontSize: 13, color: "var(--muted)" }}>Pay in:</span>
          <div className="payment-currency-toggle">
            <button
              className={currency === "ngn" ? "active" : ""}
              onClick={() => setCurrency("ngn")}
            >
              ₦ NGN
            </button>
            <button
              className={currency === "usd" ? "active" : ""}
              onClick={() => setCurrency("usd")}
            >
              $ USD
            </button>
          </div>
        </div>

        {err && <div className="alert error" style={{ margin: "0 0 12px" }}>{err}</div>}

        <button className="btn payment-cta" disabled={busy} onClick={subscribe}>
          {busy ? "Redirecting to Stripe…" : `Subscribe · ${price}`}
        </button>

        <p className="payment-footer">
          <Lock size={12} /> Secured by Stripe. Cancel any time from Settings.
        </p>
      </div>
    </div>
  );
}
