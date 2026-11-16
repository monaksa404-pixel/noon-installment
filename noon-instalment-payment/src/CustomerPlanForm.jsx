import { useMemo, useState } from "react";
import { createCustomer, notifyDownPayment, updateCustomerDetails, formatMoney } from "./lib/data.js";
import "./CustomerPlanForm.css";

const DURATIONS = [3, 6, 12, 18, 24];

const CURRENCIES = [
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪", dial: "+971" },
  { code: "SAR", name: "Saudi Riyal", flag: "🇸🇦", dial: "+966" },
  { code: "OMR", name: "Omani Rial", flag: "🇴🇲", dial: "+968" },
  { code: "QAR", name: "Qatari Riyal", flag: "🇶🇦", dial: "+974" },
  { code: "KWD", name: "Kuwaiti Dinar", flag: "🇰🇼", dial: "+965" },
  { code: "BHD", name: "Bahraini Dinar", flag: "🇧🇭", dial: "+973" },
];

function money(value, code = "SAR") {
  return formatMoney(value, code);
}

function splitPhone(value) {
  const match = String(value || "").trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (!match) return { dial: "+966", local: String(value || "") };
  const known = CURRENCIES.some((item) => item.dial === match[1]);
  return known ? { dial: match[1], local: match[2] } : { dial: "+966", local: String(value || "") };
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
  const [dial, setDial] = useState("+966");
  const [currency, setCurrency] = useState("SAR");
  const [locationPin, setLocationPin] = useState("");
  const [idFile, setIdFile] = useState(null);
  const [selected, setSelected] = useState([]);
  const [downPayment, setDownPayment] = useState("");
  const [duration, setDuration] = useState("12");
  const [payBank, setPayBank] = useState(true);
  const [payCard, setPayCard] = useState(false);
  const [payGift, setPayGift] = useState(false);
  const [bankAccountId, setBankAccountId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [productQuery, setProductQuery] = useState("");

  const catalog = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );
  const visibleProducts = catalog.filter((product) =>
    product.name.toLowerCase().includes(productQuery.trim().toLowerCase())
  );
  const chosen = useMemo(
    () => catalog.filter((product) => selected.includes(product.id)),
    [catalog, selected]
  );
  const paymentMethod = [payBank && "bank", payCard && "card", payGift && "gift"].filter(Boolean).join(",");
  const total = chosen.reduce((sum, product) => sum + Number(product.price || 0), 0);
  const deposit = Number(downPayment || 0);
  const months = Number(duration || 0);
  const remaining = Math.max(0, total - deposit);
  const monthly = months > 0 ? remaining / months : 0;
  const fullPhone = `${dial} ${phone.trim()}`.trim();
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
        phone: fullPhone,
        locationPin: locationPin.trim(),
        currency,
        idFile,
        products: chosen,
        downPayment: deposit,
        duration: months,
        paymentMethod,
        bankAccountId,
        createdBy,
      });

      let notice = `Customer saved. Code: ${created.customer_code}`;
      if (created.limitedMethod) {
        notice += " Both methods could not be stored yet. Run supabase/schema.sql, then edit this customer and save both methods.";
      }
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
            currency,
            note: "Down payment assigned on the customer record",
          });
          notice += " Telegram down-payment notice sent.";
        } catch (error) {
          notice += ` Telegram notice failed: ${error.message}`;
        }
      }

      setName("");
      setPhone("");
      setDial("+966");
      setCurrency("SAR");
      setLocationPin("");
      setIdFile(null);
      setSelected([]);
      setDownPayment("");
      setDuration("12");
      setPayBank(true);
      setPayCard(false);
      setBankAccountId("");
      setProductQuery("");
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
          Select currency *
          <select
            value={currency}
            onChange={(event) => {
              const next = CURRENCIES.find((item) => item.code === event.target.value);
              setCurrency(event.target.value);
              if (next) setDial(next.dial);
            }}
          >
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.flag} {item.name} ({item.code})
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Mobile number *
          <span className="plan-phone">
            <select
              aria-label="Country dialing code"
              value={dial}
              onChange={(event) => setDial(event.target.value)}
            >
              {CURRENCIES.map((item) => (
                <option key={item.dial} value={item.dial}>
                  {item.flag} {item.dial}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/[^\d\s-]/g, ""))}
              placeholder="Mobile number"
              required
            />
          </span>
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
          <label className="plan-check">
            <input
              type="checkbox"
              checked={payGift}
              onChange={(e) => setPayGift(e.target.checked)}
            />
            Noon Gift Card
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
          <input
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search products"
          />
          <div className="plan-products">
            {products.length === 0 && (
              <small>No products yet. Add a product first.</small>
            )}
            {visibleProducts.length === 0 && products.length > 0 && (
              <small>No product matches that search.</small>
            )}
            {visibleProducts.map((product) => (
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
                <b>{money(product.price, product.currency)}</b>
              </label>
            ))}
          </div>
          {chosen.length > 0 && (
            <small>{chosen.length} selected: {chosen.map((product) => product.name).join(", ")}</small>
          )}
        </div>
        <label className={fieldClass}>
          Total price
          <input value={money(total, currency)} readOnly />
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
          <input value={money(Math.max(0, remaining), currency)} readOnly />
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
          <strong>{money(total, currency)}</strong>
        </div>
        <div>
          <span>Down payment</span>
          <strong>{money(deposit, currency)}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{money(Math.max(0, remaining), currency)}</strong>
        </div>
        <div>
          <span>Monthly</span>
          <strong>{money(monthly, currency)}</strong>
        </div>
      </div>

      <button className={buttonClass} type="submit" disabled={saving || products.length === 0}>
        {saving ? "Saving..." : "Save customer"}
      </button>
    </form>
  );
}

export function CustomerEditForm({ customer, products, onCancel, onSaved }) {
  const catalog = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name)),
    [products]
  );
  const initialPhone = splitPhone(customer.phone || "");
  const [name, setName] = useState(customer.name || "");
  const [phone, setPhone] = useState(initialPhone.local);
  const [dial, setDial] = useState(initialPhone.dial);
  const [currency, setCurrency] = useState(customer.currency || "SAR");
  const [locationPin, setLocationPin] = useState(customer.locationPin || "");
  const [payBank, setPayBank] = useState(
    !customer.paymentMethods?.length || customer.paymentMethods.includes("bank")
  );
  const [payCard, setPayCard] = useState(Boolean(customer.paymentMethods?.includes("card")));
  const [payGift, setPayGift] = useState(Boolean(customer.paymentMethods?.includes("gift")));
  const [selected, setSelected] = useState(
    (customer.products || []).map((product) => product.id).filter(Boolean)
  );
  const [downPayment, setDownPayment] = useState(String(customer.downPayment ?? ""));
  const [duration, setDuration] = useState(String(customer.duration || 12));
  const [idFile, setIdFile] = useState(null);
  const [productQuery, setProductQuery] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const paymentMethod = [payBank && "bank", payCard && "card", payGift && "gift"].filter(Boolean).join(",");
  const visibleProducts = catalog.filter((product) =>
    product.name.toLowerCase().includes(productQuery.trim().toLowerCase())
  );
  const chosen = catalog.filter((product) => selected.includes(product.id));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!paymentMethod) {
      setMessage("Select at least one payment method.");
      return;
    }
    if (!chosen.length) {
      setMessage("Select at least one product.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await updateCustomerDetails({
        id: customer.id,
        name: name.trim(),
        phone: `${dial} ${phone.trim()}`.trim(),
        locationPin: locationPin.trim(),
        currency,
        paymentMethod,
        idFile,
        products: chosen,
        downPayment: Number(downPayment || 0),
        duration: Number(duration),
      });
      if (onSaved) await onSaved();
    } catch (error) {
      setMessage(error.message || "Customer could not be updated.");
      setSaving(false);
    }
  }

  return (
    <form className="plan-edit" onSubmit={handleSubmit}>
      <h2>Edit customer</h2>
      {message && <div className="plan-message">{message}</div>}
      <label className="plan-field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="plan-field">
        Currency
        <select
          value={currency}
          onChange={(event) => {
            const next = CURRENCIES.find((item) => item.code === event.target.value);
            setCurrency(event.target.value);
            if (next) setDial(next.dial);
          }}
        >
          {CURRENCIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.flag} {item.name} ({item.code})
            </option>
          ))}
        </select>
      </label>
      <label className="plan-field">
        Mobile
        <span className="plan-phone">
          <select aria-label="Country dialing code" value={dial} onChange={(event) => setDial(event.target.value)}>
            {CURRENCIES.map((item) => (
              <option key={item.dial} value={item.dial}>{item.flag} {item.dial}</option>
            ))}
          </select>
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="Mobile number"
            required
          />
        </span>
      </label>
      <label className="plan-field">
        Location
        <input value={locationPin} onChange={(e) => setLocationPin(e.target.value)} />
      </label>
      <label className="plan-check">
        <input type="checkbox" checked={payBank} onChange={(e) => setPayBank(e.target.checked)} />
        Bank Transfer
      </label>
      <label className="plan-check">
        <input type="checkbox" checked={payCard} onChange={(e) => setPayCard(e.target.checked)} />
        Credit/Debit Card
      </label>
      <label className="plan-check">
        <input type="checkbox" checked={payGift} onChange={(e) => setPayGift(e.target.checked)} />
        Noon Gift Card
      </label>
      <label className="plan-field">
        ID document
        <input type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
      </label>
      <label className="plan-field">
        Down payment
        <input type="number" min="0" step="0.01" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
      </label>
      <label className="plan-field">
        Instalment plan
        <select value={duration} onChange={(e) => setDuration(e.target.value)}>
          {DURATIONS.map((monthsOption) => (
            <option key={monthsOption} value={monthsOption}>{monthsOption} months</option>
          ))}
        </select>
      </label>
      <div className="plan-field">
        <span>Products</span>
        <input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search products" />
        <div className="plan-products">
          {visibleProducts.map((product) => (
            <label
              className={`plan-product${selected.includes(product.id) ? " is-selected" : ""}`}
              key={product.id}
            >
              <input
                type="checkbox"
                checked={selected.includes(product.id)}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(product.id)
                      ? current.filter((item) => item !== product.id)
                      : [...current, product.id]
                  )
                }
              />
              {product.image ? <img className="plan-product-image" src={product.image} alt="" /> : null}
              <span>{product.name}</span>
                <b>{money(product.price, product.currency)}</b>
            </label>
          ))}
        </div>
      </div>
      <div className="plan-edit-actions">
        <button type="button" className="plan-edit-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="plan-edit-save" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
