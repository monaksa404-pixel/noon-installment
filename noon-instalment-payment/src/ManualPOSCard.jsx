
import { useState } from "react";
import {
  CreditCard,
  ShieldCheck,
  Send,
  CheckCircle2,
} from "lucide-react";
import "./ManualPOSCard.css";

export default function ManualPOSCard({ amount = 240, onRequest }) {
  const [name, setName] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="pos-card-panel">
      <div className="pos-card-heading">
        <span className="pos-card-icon">
          <CreditCard size={25} />
        </span>
        <div>
          <h3>Manual POS Card Payment</h3>
          <p>NOON INSTALMENT · Secure Checkout</p>
        </div>
      </div>

      <div className="pos-yellow-line" />

      <div className="pos-accepted-label">Accepted Cards</div>

      <div className="pos-card-logos">
        <img src="/images/cards/visa.jpeg" alt="Visa" />
        <img src="/images/cards/mastercard.jpeg" alt="Mastercard" />
        <img src="/images/cards/mada.jpeg" alt="mada" />
      </div>

      <div className="pos-black-card">
        <div className="pos-card-brand">NOON</div>
        <div className="pos-card-chip">▤</div>
        <div className="pos-card-number">
          •••• &nbsp; •••• &nbsp; •••• &nbsp; ••••
        </div>
        <div className="pos-card-bottom">
          <div>
            <small>CARDHOLDER</small>
            <strong>{name.trim() || "YOUR NAME"}</strong>
          </div>
          <div className="pos-card-expiry">
            <small>EXPIRES</small>
            <strong>MM/YY</strong>
          </div>
        </div>
      </div>

      {requestSent ? (
        <div className="pos-request-success">
          <CheckCircle2 size={26} />
          <h3>Request Submitted</h3>
          <p>
            {onRequest
              ? "Your card payment request was sent to admin for approval."
              : "Demo request displayed. No request has been sent to an admin."}
          </p>
          <span>Status: Pending</span>
          <button
            type="button"
            onClick={() => setRequestSent(false)}
          >
            Back to Payment
          </button>
        </div>
      ) : (
        <>
          <div className="pos-amount-box">
            <span>Instalment Amount</span>
            <strong>
              SAR{" "}
              {Number(amount).toLocaleString("en-SA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>

          <form
            className="pos-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const cardName = name.trim();
              if (!cardName) {
                setError("Enter the cardholder name.");
                return;
              }
              if (!onRequest) {
                setRequestSent(true);
                return;
              }
              setBusy(true);
              setError("");
              try {
                await onRequest(cardName);
                setRequestSent(true);
              } catch (requestError) {
                setError(requestError.message || "Request failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="pos-name">Cardholder Name</label>
            <input
              id="pos-name"
              type="text"
              name="cardholder"
              placeholder="Enter name on card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              enterKeyHint="done"
              required
            />

            <div className="pos-notice">
              <ShieldCheck size={19} />
              <p>
                Manual POS payment request only. Never share
                your card PIN, CVV or bank OTP with an admin.
              </p>
            </div>

            {error && <p className="pos-demo-note">{error}</p>}

            <button
              type="submit"
              className="pos-submit-button"
              disabled={busy}
            >
              <Send size={18} />
              {busy ? "Submitting..." : "Submit POS Payment Request"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
