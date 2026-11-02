import { useEffect, useState } from "react";
import {
  Check,
  ShoppingBag,
  Package,
  Truck,
  Home,
  X,
  XCircle,
  CalendarDays,
  Wallet,
} from "lucide-react";
import { getOrderTracking, saveOrderTracking } from "./lib/data.js";
import "./OrderTracking.css";

const JOURNEY_STEPS = [
  {
    key: "confirmed",
    label: "Confirmed",
    done: "Your order has been confirmed",
    pending: "Waiting for confirmation",
    Icon: Check,
  },
  {
    key: "placed",
    label: "Placed",
    done: "Your order has been placed",
    pending: "Waiting to be placed",
    Icon: ShoppingBag,
  },
  {
    key: "packed",
    label: "Packed",
    done: "Your product is packed",
    pending: "Waiting to be packed",
    Icon: Package,
  },
  {
    key: "dispatched",
    label: "Dispatched",
    done: "Your order has been dispatched",
    pending: "Waiting for dispatch",
    Icon: Truck,
  },
  {
    key: "delivered",
    label: "Delivered",
    done: "Your order has been delivered",
    pending: "Waiting for delivery",
    Icon: Home,
  },
];

export const ORDER_STEPS = JOURNEY_STEPS;

export const emptyTracking = {
  confirmed: false,
  placed: false,
  packed: false,
  dispatched: false,
  delivered: false,
  rejected: false,
  rejectionReason: "",
  deliveryDate: "",
  showDeliveryDate: false,
  showPopup: true,
};

function deliveryLabel(value) {
  const raw = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return new Date(`${raw}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrderTrackingPopup({ customer, tracking, onClose }) {
  const status = tracking || emptyTracking;
  const product = customer?.products?.[0];
  const downPaid = Boolean(customer?.paidDownPayment);
  const steps = [
    {
      key: "down_payment",
      label: downPaid ? "Down payment paid" : "Awaiting for down payment",
      detail: downPaid ? "Down payment received" : "Waiting for down payment",
      done: downPaid,
      Icon: Wallet,
    },
    ...JOURNEY_STEPS.map((step) => ({
      key: step.key,
      label: step.label,
      detail: status[step.key] ? step.done : step.pending,
      done: Boolean(status[step.key]),
      Icon: step.Icon,
    })),
  ];
  const progress = status.rejected
    ? "Rejected"
    : status.delivered
      ? "Delivered"
      : "In Progress";

  return (
    <div className="ot-overlay" role="dialog" aria-modal="true">
      <div className="ot-sheet">
        <header className="ot-header">
          <div className="ot-brand">
            <span className="ot-brand-mark">
              <Package size={18} />
            </span>
            <span>
              <strong>NOON INSTALMENT</strong>
              <small>ORDER TRACKING</small>
            </span>
          </div>
          <button type="button" className="ot-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <h2>Track Your Order</h2>
          <p>Your order journey, all in one place.</p>
        </header>

        <div className="ot-body">
          <div className="ot-product">
            {product?.image ? (
              <img src={product.image} alt="" />
            ) : (
              <span className="ot-product-fallback">
                <Package size={28} />
              </span>
            )}
            <div>
              {status.confirmed && <span className="ot-pill">Order Confirmed</span>}
              <h3>{product?.name || customer?.productName || "Your product"}</h3>
              <p>Your selected product</p>
              <small>Order ID: #{customer?.code || customer?.customerId || ""}</small>
            </div>
          </div>

          <div className="ot-progress-head">
            <h3>Order Progress</h3>
            <span className={status.rejected ? "ot-state is-rejected" : "ot-state"}>{progress}</span>
          </div>

          <ol className="ot-steps">
            {steps.map((step, index) => {
              const Icon = step.Icon;
              return (
                <li key={step.key} className={step.done ? "is-done" : "is-pending"}>
                  {index < steps.length - 1 && <span className="ot-line" />}
                  <span className="ot-step-icon">
                    {step.done ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <div>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
                  </div>
                  <span className="ot-badge">{step.done ? "Done" : "Pending"}</span>
                </li>
              );
            })}
          </ol>

          {status.rejected && (
            <div className="ot-rejected">
              <span className="ot-step-icon">
                <XCircle size={16} />
              </span>
              <div>
                <strong>Rejected</strong>
                <p>{status.rejectionReason || "This order was rejected"}</p>
              </div>
            </div>
          )}

          {status.showDeliveryDate && status.deliveryDate && (
            <div className="ot-delivery">
              <span>
                <CalendarDays size={16} /> Estimated Delivery
              </span>
              <strong>{deliveryLabel(status.deliveryDate)}</strong>
              <p>Delivery date confirmed by our team</p>
            </div>
          )}

          <p className="ot-thanks">Thank you for choosing Noon Instalment</p>
        </div>
      </div>
    </div>
  );
}

export function OrderTrackingAdmin({ customers, onNotify }) {
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState(emptyTracking);
  const [busy, setBusy] = useState(false);
  const customer = customers.find((item) => item.id === customerId);
  const product = customer?.products?.[0];

  useEffect(() => {
    if (!customerId) {
      setForm(emptyTracking);
      return;
    }
    let active = true;
    getOrderTracking(customerId).then((row) => {
      if (active) setForm(row ? { ...emptyTracking, ...row } : emptyTracking);
    });
    return () => {
      active = false;
    };
  }, [customerId]);

  function toggle(key) {
    setForm((current) => ({ ...current, [key]: !current[key] }));
  }

  async function save(event) {
    event.preventDefault();
    if (!customer) return;
    setBusy(true);
    try {
      await saveOrderTracking(customer.id, form);
      onNotify("Order tracking saved.");
    } catch (error) {
      onNotify(error.message || "Could not save order tracking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card ot-panel">
      <div className="admin-card-heading">
        <div>
          <h2>Order Tracking</h2>
          <p>Update one customer order. Payment amounts stay hidden from this view.</p>
        </div>
      </div>
      <form className="ot-admin" onSubmit={save}>
        <label>
          Customer
          <select value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            <option value="">Select a customer</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.customerId} · {item.name}
              </option>
            ))}
          </select>
        </label>

        {customer && (
          <>
            <div className="ot-admin-customer">
              {product?.image ? <img src={product.image} alt="" /> : <Package size={28} />}
              <div>
                <strong>{customer.name}</strong>
                <span>Code: {customer.customerId}</span>
                <span>{product?.name || customer.productName || "No product"}</span>
              </div>
            </div>

            <label className="ot-admin-show">
              <input
                type="checkbox"
                checked={form.showPopup !== false}
                onChange={() =>
                  setForm((current) => ({ ...current, showPopup: current.showPopup === false }))
                }
              />
              Show tracking popup to customer
            </label>

            <div className="ot-admin-checks">
              {JOURNEY_STEPS.map((step) => (
                <label key={step.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(form[step.key])}
                    onChange={() => toggle(step.key)}
                  />
                  {step.label}
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(form.rejected)}
                  onChange={() => toggle("rejected")}
                />
                Rejected
              </label>
            </div>

            {form.rejected && (
              <label>
                Rejection reason
                <textarea
                  value={form.rejectionReason || ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, rejectionReason: event.target.value }))
                  }
                  placeholder="Reason shown to the customer"
                />
              </label>
            )}

            <label>
              Expected delivery date
              <input
                type="date"
                value={String(form.deliveryDate || "").slice(0, 10)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deliveryDate: event.target.value }))
                }
              />
            </label>

            <label className="ot-admin-show">
              <input
                type="checkbox"
                checked={Boolean(form.showDeliveryDate)}
                onChange={() => toggle("showDeliveryDate")}
              />
              Show delivery date to customer
            </label>

            <button type="submit" className="admin-primary-button" disabled={busy}>
              {busy ? "Saving..." : "Save tracking"}
            </button>
          </>
        )}
      </form>
    </section>
  );
}
