
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Archive,
  BadgeCheck,
  ImagePlus,
  LogOut,
  Package,
  RotateCcw,
  Eye,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import CustomerPlanForm from "./CustomerPlanForm";
import {
  deactivateProduct,
  listBanks,
  listCustomers,
  listProducts,
  saveProduct,
  deleteCustomer,
  setCustomerArchived,
} from "./lib/data.js";
import NoonLogo from "./NoonLogo";
import "./SupervisorPanel.css";

const initialProductForm = {
  name: "",
  price: "",
  sellerType: "noon",
};

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ر.س`;
}

export default function SupervisorPanel({ onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [archived, setArchived] = useState([]);
  const [banks, setBanks] = useState([]);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [productImage, setProductImage] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const jobs = [
        [listProducts, setProducts],
        [() => listCustomers(false), setCustomers],
        [() => listCustomers(true), setArchived],
        [listBanks, setBanks],
      ];
      const errors = [];
      await Promise.all(
        jobs.map(async ([loader, setter]) => {
          try {
            const rows = await loader();
            if (!cancelled) setter(rows);
          } catch (error) {
            errors.push(error.message);
          }
        })
      );
      if (!cancelled && errors.length) setMessage(errors[0]);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.customerId,
        customer.name,
        customer.phone,
        customer.productName,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [customers, search]);

  const filteredArchived = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return archived;

    return archived.filter((customer) =>
      [
        customer.customerId,
        customer.name,
        customer.phone,
        customer.productName,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [archived, search]);

  function updateProduct(field, value) {
    setProductForm((previous) => ({ ...previous, [field]: value }));
  }

  function openPage(nextPage) {
    setMessage("");
    setSearch("");
    setSelectedCustomer(null);
    setPage(nextPage);
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setMessage("");

    const name = productForm.name.trim();
    const price = Number(productForm.price);

    if (!name || !Number.isFinite(price) || price <= 0) {
      setMessage("Enter a valid product name and price.");
      return;
    }

    setSaving(true);

    try {
      const saved = await saveProduct({
        name,
        price,
        sellerType: productForm.sellerType,
        file: productImage,
      });
      setProducts((current) => [saved, ...current]);
      setProductForm(initialProductForm);
      setProductImage(null);
      setMessage("Product saved successfully.");
    } catch (error) {
      setMessage(error.message || "Product could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomer(customer) {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer(customer.id);
      setSelectedCustomer(null);
      setReloadKey((value) => value + 1);
      setMessage("Customer deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function archiveCustomer(customer) {
    if (!window.confirm(`Archive the record for ${customer.name}?`)) {
      return;
    }
    try {
      await setCustomerArchived(customer.id, true);
      setSelectedCustomer(null);
      setReloadKey((value) => value + 1);
      setMessage("Customer record archived.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function restoreCustomer(customer) {
    try {
      await setCustomerArchived(customer.id, false);
      setSelectedCustomer(null);
      setReloadKey((value) => value + 1);
      setMessage("Customer record restored.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeProduct(product) {
    const inUse = customers.some((customer) =>
      (customer.products || []).some((item) => item.id === product.id)
    );

    if (inUse) {
      setMessage(
        "This product is assigned to a customer and cannot be removed."
      );
      return;
    }

    if (!window.confirm(`Remove product "${product.name}"?`)) return;

    try {
      await deactivateProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage("Product removed.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyCustomerId(customerId) {
    try {
      await navigator.clipboard.writeText(String(customerId));
      setMessage("Customer ID copied.");
    } catch {
      setMessage(`Customer ID: ${customerId}`);
    }
  }

  function goBack() {
    setMessage("");
    setSelectedCustomer(null);
    setSearch("");
    setPage("dashboard");
  }

  return (
    <section className="sp-shell">
      <header className="sp-header">
        <div className="sp-brand">
          <NoonLogo className="sp-brand-icon noon-logo" />
          <div>
            <strong>NOON INSTALMENT</strong>
            <span>SUPERVISOR PANEL</span>
          </div>
        </div>

        <button
          type="button"
          className="sp-button sp-button-light"
          onClick={onLogout}
        >
          <LogOut size={17} />
          Logout
        </button>
      </header>

      <div className="sp-main">
        <div className="sp-page-heading">
          <div>
            <div className="sp-eyebrow">
              <ShieldCheck size={16} />
              CUSTOMER MANAGEMENT
            </div>
            <h1>
              {page === "dashboard" && "Supervisor Dashboard"}
              {page === "add-user" && "Add New User"}
              {page === "add-product" && "Add Product"}
              {page === "products" && "Products List"}
              {page === "records" && "Customer Records"}
              {page === "archived" && "Archived Records"}
            </h1>
            <p>Manage products, customer accounts, and instalment plans.</p>
          </div>

          {page !== "dashboard" && (
            <button
              type="button"
              className="sp-button sp-button-light"
              onClick={goBack}
            >
              <ArrowLeft size={17} />
              Back to Dashboard
            </button>
          )}
        </div>

        {message && (
          <div className="sp-message" role="status">
            {message}
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        {page === "dashboard" && (
          <>
            <div className="sp-stats">
              <div className="sp-stat-card">
                <Users size={23} />
                <span>Active Customers</span>
                <strong>{customers.length}</strong>
              </div>
              <div className="sp-stat-card">
                <Package size={23} />
                <span>Products</span>
                <strong>{products.length}</strong>
              </div>
              <div className="sp-stat-card">
                <Archive size={23} />
                <span>Archived Records</span>
                <strong>{archived.length}</strong>
              </div>
            </div>

            <div className="sp-action-grid">
              <ActionCard
                icon={UserPlus}
                title="Add New User"
                text="Create a customer and instalment plan."
                onClick={() => openPage("add-user")}
              />
              <ActionCard
                icon={ImagePlus}
                title="Add Product"
                text="Add a product, image, price, and seller type."
                onClick={() => openPage("add-product")}
              />
              <ActionCard
                icon={Package}
                title="Products List"
                text="View and manage available products."
                onClick={() => openPage("products")}
              />
              <ActionCard
                icon={Users}
                title="Customer Records"
                text="View customer details and copy customer IDs."
                onClick={() => openPage("records")}
              />
              <ActionCard
                icon={Archive}
                title="Archived Records"
                text="Review archived records and restore them."
                onClick={() => openPage("archived")}
              />
            </div>
          </>
        )}

        {page === "add-user" && (
          <div className="sp-form-card">
            <div className="sp-form-title">
              <UserPlus size={21} />
              <div>
                <h2>Customer Information</h2>
                <p>A unique 14-digit customer code is created when you save.</p>
              </div>
            </div>
            <CustomerPlanForm
              tone="supervisor"
              products={products}
              banks={banks}
              createdBy="supervisor"
              onSaved={() => setReloadKey((value) => value + 1)}
            />
          </div>
        )}

        {page === "add-product" && (
          <form className="sp-form-card" onSubmit={handleSaveProduct}>
            <div className="sp-form-title">
              <ImagePlus size={21} />
              <div>
                <h2>Product Information</h2>
                <p>Add a product to the supervisor catalogue.</p>
              </div>
            </div>

            <div className="sp-field-grid">
              <Field label="Product Image" full>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProductImage(e.target.files?.[0] || null)}
                />
                <small>The image is stored with the shared product catalogue.</small>
              </Field>

              <Field label="Product Name *" full>
                <input
                  value={productForm.name}
                  onChange={(e) => updateProduct("name", e.target.value)}
                  required
                />
              </Field>

              <Field label="Product Price (ر.س) *">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => updateProduct("price", e.target.value)}
                  required
                />
              </Field>

              <Field label="Seller Type *">
                <select
                  value={productForm.sellerType}
                  onChange={(e) => updateProduct("sellerType", e.target.value)}
                >
                  <option value="noon">Sold by Noon</option>
                  <option value="normal">Normal Product</option>
                </select>
              </Field>
            </div>

            <div className="sp-seller-preview">
              {productForm.sellerType === "noon" ? (
                <>
                  <BadgeCheck size={19} />
                  <span>Sold by Noon</span>
                  <ShieldCheck size={17} />
                </>
              ) : (
                <>
                  <Package size={19} />
                  <span>Normal Product</span>
                </>
              )}
            </div>

            <button
              type="submit"
              className="sp-button sp-button-primary sp-submit"
              disabled={saving}
            >
              <Package size={18} />
              {saving ? "Saving..." : "Save Product"}
            </button>
          </form>
        )}

        {page === "products" && (
          <div className="sp-list-card">
            <div className="sp-list-heading">
              <h2>Available Products</h2>
              <button
                type="button"
                className="sp-button sp-button-primary"
                onClick={() => openPage("add-product")}
              >
                <ImagePlus size={17} />
                Add Product
              </button>
            </div>

            {products.length === 0 ? (
              <EmptyState text="Add your first product to get started." />
            ) : (
              <div className="sp-product-grid">
                {products.map((product) => (
                  <article className="sp-product-card" key={product.id}>
                    <div className="sp-product-image">
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <Package size={35} />
                      )}
                    </div>
                    <div className="sp-product-info">
                      <h3>{product.name}</h3>
                      {product.sellerType === "noon" ? (
                        <span className="sp-seller-badge">
                          Sold by Noon <BadgeCheck size={15} />
                        </span>
                      ) : (
                        <span className="sp-normal-badge">Normal Product</span>
                      )}
                      <strong>{formatMoney(product.price)}</strong>
                      <button
                        type="button"
                        className="sp-button sp-button-danger sp-small-button"
                        onClick={() => removeProduct(product)}
                      >
                        <Trash2 size={15} />
                        Remove Product
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {(page === "records" || page === "archived") && (
          <div className="sp-list-card">
            <div className="sp-list-heading">
              <div>
                <h2>
                  {page === "records" ? "Active Customer Records" : "Archived Customer Records"}
                </h2>
                <p>
                  {page === "records"
                    ? `${customers.length} active record(s)`
                    : `${archived.length} archived record(s)`}
                </p>
              </div>
            </div>

            <label className="sp-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, name, phone, or product"
              />
            </label>

            <CustomerTable
              customers={page === "records" ? filteredCustomers : filteredArchived}
              archived={page === "archived"}
              onCopy={copyCustomerId}
              onArchive={archiveCustomer}
              onDelete={removeCustomer}
              onRestore={restoreCustomer}
              onView={setSelectedCustomer}
            />

            {selectedCustomer && (
              <div className="sp-modal-backdrop">
                <div className="sp-modal" role="dialog" aria-modal="true">
                  <div className="sp-modal-heading">
                    <h2>Customer Details</h2>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      aria-label="Close details"
                    >
                      ×
                    </button>
                  </div>

                  <dl className="sp-detail-list">
                    <dt>Customer ID</dt>
                    <dd>{selectedCustomer.customerId}</dd>
                    <dt>Customer Name</dt>
                    <dd>{selectedCustomer.name}</dd>
                    <dt>Phone Number</dt>
                    <dd>{selectedCustomer.phone}</dd>
                    <dt>Location / Maps URL</dt>
                    <dd>{selectedCustomer.locationPin || "Not provided"}</dd>
                    <dt>Product</dt>
                    <dd>{selectedCustomer.productName}</dd>
                    <dt>Total Price</dt>
                    <dd>{formatMoney(selectedCustomer.productPrice)}</dd>
                    <dt>Down Payment</dt>
                    <dd>{formatMoney(selectedCustomer.downPayment)}</dd>
                    <dt>Remaining</dt>
                    <dd>{formatMoney(selectedCustomer.remainingAmount)}</dd>
                    <dt>Duration</dt>
                    <dd>{selectedCustomer.duration} month(s)</dd>
                    <dt>Monthly Instalment</dt>
                    <dd>{formatMoney(selectedCustomer.monthlyAmount)}</dd>
                    <dt>Payment Method</dt>
                    <dd>
                      {selectedCustomer.paymentMethod === "card"
                        ? "Credit / Debit Card"
                        : "Bank Transfer"}
                    </dd>
                    <dt>Bank Account</dt>
                    <dd>
                      {selectedCustomer.bank
                        ? `${selectedCustomer.bank.bankName} · ${selectedCustomer.bank.iban}`
                        : "Not assigned"}
                    </dd>
                    <dt>ID Document</dt>
                    <dd>{selectedCustomer.hasIdDocument ? "Uploaded" : "Not uploaded"}</dd>
                    <dt>Created</dt>
                    <dd>
                      {selectedCustomer.createdAt
                        ? new Date(selectedCustomer.createdAt).toLocaleString()
                        : "Not available"}
                    </dd>
                  </dl>

                  {selectedCustomer.locationPin?.startsWith("http") && (
                    <a
                      className="sp-button sp-button-light"
                      href={selectedCustomer.locationPin}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Location
                    </a>
                  )}

                  <button
                    type="button"
                    className="sp-button sp-button-primary sp-modal-close"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ActionCard({ icon: Icon, title, text, onClick }) {
  return (
    <button type="button" className="sp-action-card" onClick={onClick}>
      <span className="sp-action-icon">
        <Icon size={25} />
      </span>
      <strong>{title}</strong>
      <span>{text}</span>
    </button>
  );
}

function Field({ label, full = false, children }) {
  return (
    <label className={`sp-field${full ? " sp-field-full" : ""}`}>
      {label}
      {children}
    </label>
  );
}

function EmptyState({ text }) {
  return (
    <div className="sp-empty">
      <Package size={35} />
      <strong>No records found</strong>
      <span>{text}</span>
    </div>
  );
}

function CustomerTable({
  customers,
  archived = false,
  onCopy,
  onArchive,
  onDelete,
  onRestore,
  onView,
}) {
  if (!customers.length) {
    return <EmptyState text="Try a different search or add a customer." />;
  }

  return (
    <div className="sp-table-wrap">
      <table className="sp-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Customer</th>
            <th>Phone</th>
            <th>Product</th>
            <th>Monthly Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.customerId}>
              <td>
                <button
                  type="button"
                  className="sp-id-button"
                  onClick={() => onCopy(customer.customerId)}
                  title="Copy customer ID"
                >
                  {customer.customerId}
                </button>
              </td>
              <td>{customer.name}</td>
              <td>{customer.phone}</td>
              <td>{customer.productName}</td>
              <td>{formatMoney(customer.monthlyAmount)}</td>
              <td>
                <div className="sp-row-actions">
                  <button
                    type="button"
                    className="sp-icon-button"
                    title="View customer details"
                    onClick={() => onView(customer)}
                  >
                    <Eye size={16} />
                  </button>
                  {archived ? (
                    <button
                      type="button"
                      className="sp-icon-button sp-restore"
                      title="Restore customer"
                      onClick={() => onRestore(customer)}
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="sp-icon-button sp-archive"
                      title="Archive customer"
                      onClick={() => onArchive(customer)}
                    >
                      <Archive size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="sp-icon-button sp-delete"
                      title="Delete customer"
                      onClick={() => onDelete(customer)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
