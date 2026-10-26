import { useMemo, useState } from "react";
import { createCustomer, notifyDownPayment } from "./lib/data.js";
import "./CustomerPlanForm.css";

const DURATIONS = [3, 6, 12, 18, 24];

function money(value) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export default function CustomerPlanForm({
  tone = "admin",
  products,
  banks,
  createdBy,
  onSaved,
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationPin, setLocationPin] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [selected, setSelected] = useState([]);
  const [downPayment, setDownPayment] = useState("");
  const [duration, setDuration] = useState("12");
  const [payBank, setPayBank] = useState(true);
  const [payCard, setPayCard] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const catalog = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );
  const chosen = useMemo(
    () => catalog.filter((product) => selected.includes(product.id)),
    [catalog, selected]
  );
  const paymentMethod = [payBank && "bank", payCard && "card"].filter(Boolean).join(",");
  const total = chosen.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const deposit = Number(downPayment || 0);
  const months = Number(duration || 0);
  const remaining = Math.max(0, total - deposit);
  const monthly = months > 0 ? remaining / months : 0;
  const gridClass = tone === "admin" ? "plan-grid" : "sp-field-grid";
  const fieldClass = tone === "admin" ? "plan-field" : "sp-field";
  const fullClass = `${fieldClass} ${tone === "admin" ? "plan-field-full" : "sp-field-full"}`;
  const buttonClass =
    tone === "admin"
      ? "admin-primary-button"
      : "sp-button sp-button-primary sp-submit";

  function toggleProduct(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!name.trim() || !phone.trim() || !locationPin.trim()) {
      setMessage("Enter the customer name, mobile number, and location PIN.");
      return;
    }
    if (!idFile) {
      setMessage("Upload the customer ID document.");
      return;
    }
    if (!paymentMethod) {
      setMessage("Select at least one payment method.");
      return;
    }
    if (!chosen.length) {
      setMessage("Select at least one product.");
      return;
    }
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > total) {
      setMessage("Down payment must be between 0 and the total price.");
      return;
    }
    if (!bankAccountId) {
      setMessage("Select a bank account for this customer.");
      return;
    }

    setSaving(true);
    try {
      const created = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        locationPin: locationPin.trim(),
        idFile,
        products: chosen,
        downPayment: deposit,
        duration: months,
        paymentMethod,
        bankAccountId,
        createdBy,
      });

      let notice = `Customer saved. Code: ${created.customer_code}`;
      if (Number(created.down_payment) > 0) {
        try {
          await notifyDownPayment({
            name: created.name,
            customerCode: created.customer_code,
            phone: created.phone,
            downPayment: created.down_payment,
            totalPrice: created.total_price,
            remainingAmount: created.remaining_amount,
            monthlyAmount: created.monthly_amount,
            duration: created.duration_months,
            note: "Down payment assigned on the customer record",
          });
          notice += " Telegram down-payment notice sent.";
        } catch (error) {
          notice += ` Telegram notice failed: ${error.message}`;
        }
      }

      setName("");
      setPhone("");
      setLocationPin("");
      setIdFile(null);
      setSelected([]);
      setDownPayment("");
      setDuration("12");
      setPaymentMethod("bank");
      setBankAccountId("");
      setFormKey((value) => value + 1);
      setMessage(notice);
      if (onSaved) await onSaved(created);
    } catch (error) {
      setMessage(error.message || "Customer could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {message && <div className="plan-message">{message}</div>}

      <div className={gridClass}>
        <label className={fieldClass}>
          Customer name *
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className={fieldClass}>
          Mobile number *
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+966 5X XXX XXXX"
            required
          />
        </label>
        <label className={fullClass}>
          Location PIN *
          <input
            value={locationPin}
            onChange={(e) => setLocationPin(e.target.value)}
            placeholder="Google Maps URL or location pin"
            required
          />
        </label>
        <div className={fullClass}>
          Payment methods *
          <label className="plan-check">
            <input
              type="checkbox"
              checked={payBank}
              onChange={(e) => setPayBank(e.target.checked)}
            />
            Bank Transfer
          </label>
          <label className="plan-check">
            <input
              type="checkbox"
              checked={payCard}
              onChange={(e) => setPayCard(e.target.checked)}
            />
            Credit/Debit Card
          </label>
        </div>
        <label className={fullClass}>
          ID document *
          <input
            key={formKey}
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setIdFile(e.target.files?.[0] || null)}
            required
          />
        </label>
        <div className={fullClass}>
          <span>Product Selection *</span>
          <div className="plan-products">
            {products.length === 0 && (
              <small>No products yet. Add a product first.</small>
            )}
            {catalog.map((product) => (
              <label
                className={`plan-product${selected.includes(product.id) ? " is-selected" : ""}`}
                key={product.id}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(product.id)}
                  onChange={() => toggleProduct(product.id)}
                />
                {product.image ? (
                  <img className="plan-product-image" src={product.image} alt="" />
                ) : null}
                <span>{product.name}</span>
                <b>{money(product.price)}</b>
              </label>
            ))}
          </div>
        </div>
        <label className={fieldClass}>
          Total price
          <input value={money(total)} readOnly />
        </label>
        <label className={fieldClass}>
          Down payment *
          <input
            type="number"
            min="0"
            max={total || undefined}
            step="0.01"
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            required
          />
        </label>
        <label className={fieldClass}>
          Remaining amount
          <input value={money(Math.max(0, remaining))} readOnly />
        </label>
        <label className={fieldClass}>
          Instalment plan *
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            {DURATIONS.map((monthsOption) => (
              <option key={monthsOption} value={monthsOption}>
                {monthsOption} months
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Monthly instalment
          <input value={total ? monthly.toFixed(2) : ""} readOnly />
        </label>
        <label className={fieldClass}>
          Bank account *
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            required
          >
            <option value="">Select a bank account</option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.bankName} — {bank.accountName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="plan-calc">
        <div>
          <span>Total price</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Down payment</span>
          <strong>{money(deposit)}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{money(Math.max(0, remaining))}</strong>
        </div>
        <div>
          <span>Monthly</span>
          <strong>{money(monthly)}</strong>
        </div>
      </div>

      <button className={buttonClass} type="submit" disabled={saving || products.length === 0}>
        {saving ? "Saving..." : "Save customer"}
      </button>
    </form>
  );
}
