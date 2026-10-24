
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
        <span className="pos-visa">VISA</span>
        <span className="pos-mastercard">
          <i className="pos-circle-red" />
          <i className="pos-circle-orange" />
          <b>mastercard</b>
        </span>
        <span className="pos-mada">mada</span>
      </div>

      <div className="pos-preview-caption">
        Card details stay at the POS. This sends an approval request.
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

          <div className="pos-form">
            <label htmlFor="pos-name">Cardholder Name</label>
            <input
              id="pos-name"
              type="text"
              placeholder="Enter name on card"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />

            <label>Card Number</label>
            <input
              type="text"
              value="Enter card details at POS"
              disabled
              readOnly
            />

            <div className="pos-expiry-row">
              <div>
                <label>Expiry Date</label>
                <input
                  type="text"
                  value="Handled at POS"
                  disabled
                  readOnly
                />
              </div>
              <div>
                <label>CVV</label>
                <input
                  type="text"
                  value="Not collected"
                  disabled
                  readOnly
                />
              </div>
            </div>

            <div className="pos-notice">
              <ShieldCheck size={19} />
              <p>
                Manual POS payment request only. Never share
                your card PIN, CVV or bank OTP with an admin.
              </p>
            </div>

            {error && <p className="pos-demo-note">{error}</p>}

            <button
              type="button"
              className="pos-submit-button"
              onClick={async () => {
                if (!onRequest) {
                  setRequestSent(true);
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  await onRequest(name.trim());
                  setRequestSent(true);
                } catch (requestError) {
                  setError(requestError.message || "Request failed");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!name.trim() || busy}
            >
              <Send size={18} />
              {busy ? "Submitting..." : "Submit POS Payment Request"}
            </button>

            <p className="pos-demo-note">
              Card number, expiry, and CVV are not collected here.
              The request is approved by admin, the same manual POS flow.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
