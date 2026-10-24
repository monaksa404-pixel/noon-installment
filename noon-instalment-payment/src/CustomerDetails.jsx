
import React from "react";
import {
  UserRound,
  Phone,
  MapPin,
  ShieldCheck,
  FileText,
  Eye,
  Smartphone,
  CalendarDays,
  Wallet,
  CheckCircle2,
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

  return (
    <main className="customer-details">
      <div className="cd-body">
        {onBack && (
          <button className="cd-back" onClick={onBack}>
            <ArrowLeft size={15} />
            Back
          </button>
        )}

        <div className="cd-title-row">
          <div>
            <span className="cd-eyebrow">CUSTOMER PROFILE</span>
            <h1>Customer Details</h1>
            <p>Review your account and instalment plan.</p>
          </div>

          <div className="cd-code">
            <span>Customer Code</span>
            <strong>{customer.code}</strong>
          </div>
        </div>

        {/* Customer information and location */}
        <section className="cd-profile-grid">
          {/* Customer information */}
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

            {/* Only Verified or Pending */}
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
          </div>

          {/* Customer location and direct map */}
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
              <strong>
                {customer.city || "Location not added"}
              </strong>
            </div>

            <a
              className="cd-map-link"
              href={mapOpenUrl}
              target="_blank"
              rel="noreferrer"
            >
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
              <p>Uploaded by admin for this customer code</p>
            </div>

            {customer.idDocumentUrl && (
              <a
                className="cd-view-document"
                href={customer.idDocumentUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="View customer ID"
              >
                <Eye size={15} />
              </a>
            )}
          </div>

          {customer.idDocumentUrl ? (
            <a
              className="cd-document-preview"
              href={customer.idDocumentUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={20} />
              <span>
                <strong>Customer ID Document</strong>
                <small>Uploaded by Admin</small>
              </span>
              <ExternalLink size={14} />
            </a>
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

          <div className="cd-product">
            <div className="cd-product-icon">
              <Smartphone size={21} />
            </div>
            <div className="cd-product-info">
              <h3>{customer.productName || customer.product}</h3>
              <small>Customer Code: {customer.code}</small>
            </div>
          </div>

          {Array.isArray(customer.products) && customer.products.length > 0 && (
            <ul className="cd-product-list">
              {customer.products.map((product) => (
                <li key={`${product.id}-${product.name}`}>
                  <span>{product.name}</span>
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

            <div className="cd-price-box">
              <span>Payment Options</span>
              <strong>
                {customer.paymentMethod === "card"
                  ? "Card or bank transfer"
                  : "Bank transfer or card"}
              </strong>
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
          <div className="cd-down-payment">
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

              return (
                <div
                  key={month}
                  className={`cd-installment ${
                    isPaid ? "is-paid" : "is-pending"
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
                    {isPaid ? "Paid" : "Pending"}
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

        <footer className="cd-footer">
          <ShieldCheck size={13} />
          <span>NOON INSTALMENT · CUSTOMER ACCOUNT</span>
        </footer>
      </div>
    </main>
  );
}
