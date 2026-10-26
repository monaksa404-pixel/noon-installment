
import React, { useEffect, useRef, useState } from "react";
import NoonLogo from "./NoonLogo";
import {
  UserRound,
  Phone,
  MapPin,
  ShieldCheck,
  FileText,
  Smartphone,
  CalendarDays,
  Wallet,
  CheckCircle2,
  BadgeCheck,
  Clock3,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import "./CustomerDetails.css";

const demoCustomer = {
  code: "NOON123",
  name: "Ahmed Example",
  phone: "+966 5X XXX XXXX",
  verified: true,
  city: "Riyadh, Saudi Arabia",
  mapUrl: "https://maps.google.com/?q=24.7136,46.6753",
  latitude: 24.7136,
  longitude: 46.6753,
  idDocumentUrl: "",
  productName: "Samsung Galaxy Smartphone",
  productPrice: 1800,
  downPayment: 360,
  duration: 6,
  monthlyAmount: 240,
  startDate: "2026-10-22",
  paidDownPayment: true,
  paidMonths: [1, 2],
};

function SellerLine({ sellerType }) {
  if (sellerType === "Sold by Noon") {
    return (
      <span className="cd-seller-noon">
        Sold by Noon <BadgeCheck size={14} />
      </span>
    );
  }
  if (sellerType === "Normal") {
    return <span className="cd-seller-normal">Normal Product</span>;
  }
  return null;
}

function formatSAR(amount) {
  return `SAR ${Number(amount || 0).toLocaleString("en-US")}`;
}

function getDueDate(startDate, month) {
  const date = new Date(`${startDate || "2026-10-22"}T12:00:00`);
  date.setMonth(date.getMonth() + month);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CustomerDetails({
  customer = demoCustomer,
  onBack,
  onContinue,
  onPayNext,
}) {
  const duration = Math.max(
    0,
    Math.min(60, Number(customer.duration) || 0)
  );

  const paidMonths = customer.paidMonths || [];

  const hasCoordinates =
    customer.latitude !== undefined &&
    customer.latitude !== null &&
    customer.longitude !== undefined &&
    customer.longitude !== null &&
    customer.latitude !== "" &&
    customer.longitude !== "";

  const mapQuery = hasCoordinates
    ? `${customer.latitude},${customer.longitude}`
    : customer.city || "Riyadh, Saudi Arabia";

  const mapEmbedUrl =
    `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;

  const mapOpenUrl = hasCoordinates
    ? `https://maps.google.com/?q=${customer.latitude},${customer.longitude}`
    : customer.mapUrl ||
      `https://maps.google.com/?q=${encodeURIComponent(mapQuery)}`;

  const activity = customer.activity || [];
  const [statementOpen, setStatementOpen] = useState(false);
  const [popup, setPopup] = useState(null);
  const [copied, setCopied] = useState(false);
  const holdTimer = useRef(null);
  const methods = (customer.paymentMethods || []).filter(
    (method) => method === "bank" || method === "card"
  );

  const latestId = activity[0]?.id || "";
  useEffect(() => {
    const latest = activity[0];
    if (!latest) {
      setPopup(null);
      return;
    }
    const seen = sessionStorage.getItem(`noon-note-${customer.code}-${latest.id}`);
    setPopup(seen ? null : latest);
  }, [customer.code, latestId]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(String(customer.code || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function startHold() {
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(copyCode, 500);
  }

  function stopHold() {
    clearTimeout(holdTimer.current);
  }

  function closePopup() {
    if (popup) {
      sessionStorage.setItem(`noon-note-${customer.code}-${popup.id}`, "1");
    }
    setPopup(null);
  }

  function when(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="customer-details">
      <div className="cd-body">
        {popup && (
          <div className={`cd-popup is-${popup.tone}`}>
            <NoonLogo className="cd-popup-logo" />
            <div>
              <strong>{popup.text}</strong>
              {popup.at && <small>{when(popup.at)}</small>}
            </div>
            <button type="button" onClick={closePopup} aria-label="Close">
              ×
            </button>
          </div>
        )}
        {onBack && (
          <button className="cd-back" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        )}

        <section className="cd-profile-grid">
          <div className="cd-card cd-profile-card">
            <div className="cd-section-heading">
              <div className="cd-icon-box">
                <UserRound size={18} />
              </div>
              <div>
                <h2>Customer Details</h2>
                <p>Registered information</p>
              </div>
            </div>
            <div className="cd-person">
              <div className="cd-person-info">
                <h3>{customer.name}</h3>
                <div className="cd-phone">
                  <Phone size={12} />
                  <span>{customer.phone || "Number not provided"}</span>
                </div>
              </div>
            </div>
            <div className="cd-verified-row">
              <ShieldCheck size={13} />
              <span
                className={
                  customer.verified
                    ? "cd-status cd-status-paid"
                    : "cd-status cd-status-pending"
                }
              >
                {customer.verified ? "Verified" : "Pending"}
              </span>
            </div>
            <div className="cd-code-top">
              <div
                className="cd-code"
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onContextMenu={(event) => {
                  event.preventDefault();
                  copyCode();
                }}
              >
                <span>Customer Code</span>
                <strong>{copied ? "Copied" : customer.code}</strong>
              </div>
              <button
                type="button"
                className="cd-statement-button"
                onClick={() => setStatementOpen((open) => !open)}
              >
                Statement
              </button>
            </div>
            {statementOpen && (
              <div className="cd-statement">
                <h2>Statement</h2>
                {activity.length === 0 && <p>No activity yet.</p>}
                {activity.map((item) => (
                  <div className={`cd-activity is-${item.tone}`} key={item.id}>
                    <strong>{item.text}</strong>
                    <small>{when(item.at)}</small>
                  </div>
                ))}
              </div>
            )}
            {(customer.products || []).map((product) => (
              <div className="cd-code-product" key={`${product.id}-${product.name}`}>
                <b>{product.name}</b>
                <SellerLine sellerType={product.sellerType} />
              </div>
            ))}
          </div>
          <div className="cd-card cd-location-card">
            <div className="cd-section-heading">
              <div className="cd-icon-box">
                <MapPin size={18} />
              </div>
              <div>
                <h2>Customer Location</h2>
                <p>Location added by Admin</p>
              </div>
            </div>
            <div className="cd-map-box">
              <iframe
                title="Customer Google Maps Location"
                src={mapEmbedUrl}
                width="100%"
                height="180"
                style={{ border: 0, display: "block" }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="cd-location-name">
              <MapPin size={14} />
              <strong>{customer.city || "Location not added"}</strong>
            </div>
            <a className="cd-map-link" href={mapOpenUrl} target="_blank" rel="noreferrer">
              Open Google Maps
              <ExternalLink size={12} />
            </a>
          </div>
        </section>

        {/* Customer ID document */}
        <section className="cd-card cd-document-card">
          <div className="cd-section-heading">
            <div className="cd-icon-box">
              <FileText size={17} />
            </div>

            <div>
              <h2>Customer ID Document</h2>
            </div>
          </div>

          {customer.idDocumentUrl ? (
            /\.pdf(\?|$)/i.test(customer.idDocumentUrl) ? (
              <object
                className="cd-id-image"
                data={customer.idDocumentUrl}
                aria-label="Customer ID document"
              />
            ) : (
              <img
                className="cd-id-image"
                src={customer.idDocumentUrl}
                alt="Customer ID document"
              />
            )
          ) : (
            <div className="cd-document-empty">
              <FileText size={17} />
              <div>
                <strong>ID document not uploaded</strong>
                <p>
                  The customer's document will appear here
                  after Admin uploads it.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Product details */}
        <section className="cd-card cd-product-card">
          <div className="cd-section-heading">
            <div className="cd-icon-box">
              <Smartphone size={18} />
            </div>
            <div>
              <h2>Product Details</h2>
              <p>Product and assigned payment plan</p>
            </div>
          </div>

          {Array.isArray(customer.products) && customer.products.length > 0 && (
            <ul className="cd-product-list">
              {customer.products.map((product) => (
                <li key={`${product.id}-${product.name}`}>
                  {product.image ? (
                    <img src={product.image} alt="" />
                  ) : null}
                  <span>
                    <b>{product.name}</b>
                    <SellerLine sellerType={product.sellerType} />
                  </span>
                  <strong>{formatSAR(product.price)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="cd-price-grid">
            <div className="cd-price-box">
              <span>Total Product Price</span>
              <strong>{formatSAR(customer.productPrice)}</strong>
            </div>

            <div className="cd-price-box">
              <span>Down Payment</span>
              <strong>{formatSAR(customer.downPayment)}</strong>
            </div>

            <div className="cd-price-box">
              <span>Remaining Amount</span>
              <strong>{formatSAR(customer.remainingAmount)}</strong>
            </div>

            <div className="cd-price-box">
              <span>Instalment Duration</span>
              <strong>{duration} Months</strong>
            </div>

            <div className="cd-price-box">
              <span>Monthly Instalment</span>
              <strong>{formatSAR(customer.monthlyAmount)}</strong>
            </div>
          </div>
        </section>

        {/* Payment progress */}
        <section className="cd-card cd-payments-card">
          <div className="cd-section-heading">
            <div className="cd-icon-box">
              <CalendarDays size={17} />
            </div>
            <div>
              <h2>Payment Progress</h2>
              <p>Paid instalments appear in green with a tick.</p>
            </div>
          </div>

          {/* Down payment */}
          <div
            className={`cd-down-payment ${
              customer.paidDownPayment ? "is-paid" : "is-current"
            }`}
          >
            <div className="cd-down-top">
              <div className="cd-down-icon">
                <Wallet size={17} />
              </div>

              <div className="cd-down-info">
                <h3>Down Payment</h3>
                <small>One-time payment</small>
              </div>

              <strong className="cd-down-amount">
                {formatSAR(customer.downPayment)}
              </strong>
            </div>

            <div
              className={
                customer.paidDownPayment
                  ? "cd-payment-status is-paid"
                  : "cd-payment-status is-pending"
              }
            >
              {customer.paidDownPayment ? (
                <CheckCircle2 size={13} />
              ) : (
                <Clock3 size={13} />
              )}
              {customer.paidDownPayment ? "Paid" : "Pending"}
            </div>
          </div>

          <div className="cd-installments-heading">
            <h3>Monthly Instalments</h3>
            <span>{duration} payments</span>
          </div>

          <div className="cd-installments-grid">
            {Array.from({ length: duration }, (_, index) => {
              const month = index + 1;
              const isPaid = paidMonths.includes(month);
              const isCurrent = (customer.enabledMonths || []).includes(month);

              return (
                <div
                  key={month}
                  className={`cd-installment ${
                    isPaid ? "is-paid" : isCurrent ? "is-current" : "is-pending"
                  }`}
                >
                  <div className="cd-installment-top">
                    <span>Month {month}</span>
                    {isPaid ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <Clock3 size={12} />
                    )}
                  </div>

                  <strong>
                    {formatSAR(customer.monthlyAmount)}
                  </strong>

                  <span className="cd-due-date">
                    {getDueDate(customer.startDate, month)}
                  </span>

                  <span className="cd-installment-status">
                    {isPaid ? "Paid" : isCurrent ? "Awaiting payment" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="cd-payment-note">
            Payment status is updated only after Admin verification
            or confirmed payment gateway notification.
          </div>
        </section>

        <div className="cd-actions">
          {onContinue && (
            <button
              className="cd-continue"
              type="button"
              onClick={onContinue}
              disabled={!customer.nextDue?.amount}
            >
              Continue to Payment
              <ArrowRight size={16} />
            </button>
          )}
          {onPayNext && (
            <button
              className="cd-continue cd-pay-next"
              type="button"
              onClick={onPayNext}
              disabled={!customer.nextInstalment?.amount}
            >
              Pay Next Instalment
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {methods.length > 0 && (
          <section className="cd-card cd-options">
            <h2>Payment Options</h2>
            {methods.map((method) => (
              <p key={method}>
                {method === "card" ? "Credit/Debit Card" : "Bank Transfer"}
              </p>
            ))}
          </section>
        )}

        <footer className="cd-footer">
          <ShieldCheck size={13} />
          <span>NOON INSTALMENT · CUSTOMER ACCOUNT</span>
        </footer>
      </div>
    </main>
  );
}
