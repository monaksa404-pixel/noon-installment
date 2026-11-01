import { useEffect, useState } from "react";
import { Mail, FileCheck2, MessageSquare, X, Upload } from "lucide-react";
import { listCustomerRequests, saveCustomerRequest, submitCustomerRequest } from "./lib/data.js";
import "./CustomerPopups.css";

const EMAIL_MESSAGE =
  "Please add your email address. We will keep you updated about your instalment plan, payment status and important information through email.";

function when(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not submitted";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerRequestPopup({ request, onClose, onSubmitted }) {
  const [email, setEmail] = useState("");
  const [response, setResponse] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const icon = request.kind === "document" ? FileCheck2 : request.kind === "custom" ? MessageSquare : Mail;
  const Icon = icon;
  const heading = request.kind === "email" ? request.title || "Stay Updated!" : request.title || "Customer Request";
  const body = request.kind === "email" ? EMAIL_MESSAGE : request.message;

  async function submit(event) {
    event.preventDefault();
    if (request.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (request.kind === "custom" && !response.trim()) {
      setError("Enter your response.");
      return;
    }
    if (request.kind === "document") {
      if (!file) {
        setError("Choose a PDF, JPG, or PNG file.");
        return;
      }
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (file.type && !allowed.includes(file.type)) {
        setError("Upload a PDF, JPG, or PNG file.");
        return;
      }
    }
    setBusy(true);
    setError("");
    try {
      await submitCustomerRequest({
        id: request.id,
        responseText: request.kind === "email" ? email.trim() : response.trim(),
        file: request.kind === "document" ? file : null,
      });
      onSubmitted(request.id);
    } catch (submitError) {
      setError(submitError.message || "Could not submit.");
      setBusy(false);
    }
  }

  return (
    <div className="cp-overlay" role="dialog" aria-modal="true">
      <form className="cp-card" onSubmit={submit}>
        <header className="cp-head">
          <span className="cp-mark"><Icon size={18} /></span>
          <strong>NOON INSTALMENT</strong>
          <button type="button" className="cp-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="cp-banner">
          <Icon size={28} />
          <h2>{request.kind === "custom" ? "Customer Request" : heading}</h2>
          <p>
            {request.kind === "custom"
              ? "We need some information from you."
              : request.kind === "document"
                ? "Please submit the requested document for your instalment account."
                : body}
          </p>
        </div>
        {request.kind === "custom" && (
          <div className="cp-copy">
            <h3>{request.title}</h3>
            <p>{request.message}</p>
          </div>
        )}
        {request.kind === "document" && (
          <div className="cp-doc">
            <span>Document Name</span>
            <strong>{request.documentName}</strong>
            <p>{request.message}</p>
          </div>
        )}
        {request.kind === "email" && (
          <label>
            Add Your Email Address
            <input
              type="email"
              placeholder="Enter your Gmail address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        )}
        {request.kind === "custom" && (
          <label>
            Your Response
            <textarea
              placeholder="Write your response here..."
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              required
            />
          </label>
        )}
        {request.kind === "document" && (
          <label className="cp-upload">
            <Upload size={22} />
            <strong>Upload Document</strong>
            <span>PDF, JPG, PNG</span>
            <small>{file ? file.name : "Choose File"}</small>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
        )}
        {error && <p className="cp-error">{error}</p>}
        <button type="submit" className="cp-submit" disabled={busy}>
          {busy ? "Submitting..." : request.kind === "email" ? "Submit Email" : request.kind === "document" ? "Submit Document" : "Submit Response"}
        </button>
        {request.kind === "email" && <p className="cp-note">Your information will be kept private.</p>}
      </form>
    </div>
  );
}

const blank = {
  id: "",
  kind: "email",
  title: "",
  message: "",
  documentName: "",
  active: true,
};

export function CustomerPopupsAdmin({ customers, onNotify }) {
  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState(blank);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const customer = customers.find((item) => item.id === customerId);

  async function load(id) {
    setRows(await listCustomerRequests(id));
  }

  useEffect(() => {
    if (!customerId) {
      setRows([]);
      return;
    }
    load(customerId);
  }, [customerId]);

  async function save(event) {
    event.preventDefault();
    if (!customer) return;
    if (!form.title.trim()) {
      onNotify("Enter a popup title.");
      return;
    }
    if (form.kind === "document" && !form.documentName.trim()) {
      onNotify("Enter the required document name.");
      return;
    }
    setBusy(true);
    try {
      await saveCustomerRequest({
        id: form.id || null,
        customerId: customer.id,
        kind: form.kind,
        title: form.title,
        message: form.kind === "email" ? EMAIL_MESSAGE : form.message,
        documentName: form.documentName,
        active: form.active,
        status: form.id ? undefined : "pending",
      });
      setForm(blank);
      await load(customer.id);
      onNotify("Popup saved.");
    } catch (error) {
      onNotify(error.message || "Could not save the popup.");
    } finally {
      setBusy(false);
    }
  }

  async function updateRow(row, changes) {
    try {
      await saveCustomerRequest({
        id: row.id,
        customerId: row.customerId,
        kind: row.kind,
        title: row.title,
        message: row.message,
        documentName: row.documentName,
        active: changes.active ?? row.active,
        status: changes.status || row.status,
      });
      await load(customerId);
      onNotify("Popup updated.");
    } catch (error) {
      onNotify(error.message || "Could not update the popup.");
    }
  }

  return (
    <section className="cp-panel">
      <div className="cp-panel-head">
        <h2>Customer Popups</h2>
        <p>Email, document, and custom requests. Saving an email address does not send an email.</p>
      </div>
      <form className="cp-admin" onSubmit={save}>
        <label>
          Customer
          <select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setForm(blank); }}>
            <option value="">Select a customer</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>{item.customerId} · {item.name}</option>
            ))}
          </select>
        </label>
        {customer && (
          <>
            <label>
              Popup type
              <select
                value={form.kind}
                disabled={Boolean(form.id)}
                onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="email">Email updates</option>
                <option value="document">Document submission</option>
                <option value="custom">Custom request</option>
              </select>
            </label>
            <label>
              Popup title
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            {form.kind === "document" && (
              <label>
                Required document name
                <input value={form.documentName} onChange={(event) => setForm((current) => ({ ...current, documentName: event.target.value }))} />
              </label>
            )}
            {form.kind !== "email" && (
              <label>
                Instructions
                <textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
              </label>
            )}
            <label className="cp-check">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              Active
            </label>
            <div className="cp-admin-actions">
              <button type="submit" className="admin-primary-button" disabled={busy}>{busy ? "Saving..." : form.id ? "Save changes" : "Create popup"}</button>
              {form.id && <button type="button" className="admin-secondary-button" onClick={() => setForm(blank)}>Cancel</button>}
            </div>
          </>
        )}
      </form>
      {customer && (
        <div className="cp-list">
          {rows.length === 0 && <p>No popups for this customer yet.</p>}
          {rows.map((row) => (
            <article key={row.id}>
              <header>
                <strong>{row.title || row.kind}</strong>
                <span>{row.status}{row.active ? "" : " · inactive"}</span>
              </header>
              <p>{row.kind} · {customer.name} · {customer.customerId}</p>
              {row.documentName && <p>Document: {row.documentName}</p>}
              {row.responseText && <p>Response: {row.responseText}</p>}
              <p>{when(row.submittedAt || row.createdAt)}</p>
              {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noreferrer">View document</a>}
              <div>
                <button type="button" onClick={() => setForm({ id: row.id, kind: row.kind, title: row.title, message: row.message, documentName: row.documentName, active: row.active })}>Edit</button>
                <button type="button" onClick={() => updateRow(row, { active: !row.active })}>{row.active ? "Deactivate" : "Activate"}</button>
                <button type="button" onClick={() => updateRow(row, { status: "pending", active: true })}>Reopen</button>
                {row.status === "submitted" && <button type="button" onClick={() => updateRow(row, { status: "reviewed" })}>Mark reviewed</button>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
