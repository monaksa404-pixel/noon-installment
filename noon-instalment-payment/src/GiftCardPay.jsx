import { useState } from "react";
import { ArrowLeft, CreditCard, Eye, EyeOff, Lock } from "lucide-react";
import "./GiftCardPay.css";

function digits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 40);
}

function grouped(value) {
  return value.replace(/(.{4})/g, "$1 ").trim();
}

export default function GiftCardPay({ dueAmount, busy, done, error, onBack, onPay }) {
  const [step, setStep] = useState("amount");
  const [amount, setAmount] = useState("");
  const [number, setNumber] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [localError, setLocalError] = useState("");
  const amountNumber = Number(amount);
  const amountOk = /^\d+$/.test(amount) && amountNumber > 0 && amountNumber <= 100000;
  const numberOk = number.length > 0;
  const pinOk = pin.length > 0;
  const shownError = localError || error;

  function continueAmount() {
    if (!amountOk) {
      setLocalError("Enter a whole gift card amount.");
      return;
    }
    setLocalError("");
    setStep("details");
  }

  function pay() {
    if (!numberOk) {
      setLocalError("Enter the gift card number.");
      return;
    }
    if (!pinOk) {
      setLocalError("Enter the gift card PIN.");
      return;
    }
    setLocalError("");
    onPay({ amount: amountNumber, number, pin });
  }

  return (
    <section className="gc-screen">
      <header className="gc-top">
        <button type="button" onClick={step === "details" && !done ? () => setStep("amount") : onBack} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <strong>Noon Gift Card Payment</strong>
      </header>

      <div className="gc-steps">
        <span className={step === "amount" && !done ? "is-current" : "is-done"}>1</span>
        <i />
        <span className={done ? "is-done" : step === "details" ? "is-current" : ""}>2</span>
        <i className={done ? "is-done" : ""} />
        <span className={done ? "is-current" : ""}>3</span>
      </div>
      <div className="gc-step-labels">
        <span>Amount</span>
        <span>Details</span>
        <span>Confirm</span>
      </div>

      <div className="gc-card">
        <div className="gc-brand">
          <img src="/images/noon-2-mark.png" alt="noon" />
          <span />
          <strong>Gift Card</strong>
        </div>
        {(step === "details" || amountOk) && (
          <div className="gc-preview">
            <p>Amount</p>
            <b>{amountOk ? `${amountNumber} SAR` : ""}</b>
            {step === "details" && (
              <>
                <p><CreditCard size={14} /> {number ? grouped(number) : ""}</p>
                <p><Lock size={14} /> {pin ? `PIN: ${pin}` : ""}</p>
              </>
            )}
          </div>
        )}
      </div>

      {done ? (
        <div className="gc-result">
          <h2>Submitted</h2>
          <p>Pending Approval. An admin will approve or reject this gift card payment.</p>
        </div>
      ) : step === "amount" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            continueAmount();
          }}
        >
          <h2>Enter Gift Card Amount</h2>
          <p>Enter the amount of your Noon Gift Card to proceed with payment.</p>
          <p className="gc-due">Amount due for this instalment: {Number(dueAmount || 0).toLocaleString("en-US")} SAR. Approving the request marks that instalment paid.</p>
          <label>
            Gift Card Amount (SAR)
            <span>
              <CreditCard size={16} />
              <input
                inputMode="numeric"
                value={amount}
                placeholder=""
                onChange={(event) => {
                  setAmount(digits(event.target.value));
                  setLocalError("");
                }}
              />
            </span>
          </label>
          {amount && !amountOk && <p className="gc-error">Enter a whole amount greater than 0.</p>}
          {shownError && <p className="gc-error">{shownError}</p>}
          <button type="submit" className="gc-action">Continue →</button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pay();
          }}
        >
          <h2>Enter Gift Card Details</h2>
          <p>Please enter your Noon Gift Card number and PIN.</p>
          <label>
            Gift Card Number
            <span>
              <CreditCard size={16} />
              <input
                inputMode="numeric"
                value={grouped(number)}
                placeholder=""
                onChange={(event) => {
                  setNumber(digits(event.target.value));
                  setLocalError("");
                }}
              />
              {numberOk && <em>✓</em>}
            </span>
          </label>
          <label>
            Gift Card PIN
            <span>
              <Lock size={16} />
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                value={pin}
                placeholder=""
                onChange={(event) => {
                  setPin(digits(event.target.value));
                  setLocalError("");
                }}
              />
              <button type="button" aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((value) => !value)}>
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {pinOk && <em>✓</em>}
            </span>
          </label>
          {shownError && <p className="gc-error">{shownError}</p>}
          <button type="submit" className="gc-action" disabled={busy}>{busy ? "Submitting..." : "Pay Now"}</button>
        </form>
      )}
    </section>
  );
}
