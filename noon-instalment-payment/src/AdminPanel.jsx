import NoonLogo from "./NoonLogo";
import "./AdminPanel.css";
import { useEffect, useMemo, useState } from "react";
import CustomerPlanForm from "./CustomerPlanForm";
import {
  deactivateBank,
  deactivateProduct,
  deleteCustomer,
  enableNextInstalment,
  deleteSupervisor as removeSupervisorRecord,
  listBanks,
  listCustomers,
  listPayments,
  listProducts,
  listSupervisors,
  reviewPayment,
  saveBank,
  saveProduct,
  saveSupervisor,
  updateCustomerDetails,
  updateProduct,
  setCustomerArchived,
} from "./lib/data.js";
import {
  Archive,
  BadgeCheck,
  Bell,
  CheckCircle,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  UserCog,
  UserPlus,
  XCircle,
  RotateCcw,
  Wallet,
  DollarSign,
  Save,
  ImagePlus,
  Eye,
  LogOut,
  ChartNoAxesCombined,
} from "lucide-react";

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdminPanel({ onLogout }) {
  const [section, setSection] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [archived, setArchived] = useState([]);
  const [payments, setPayments] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [banks, setBanks] = useState([]);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountName: "",
    iban: "",
    instructions: "",
  });

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [productForm, setProductForm] = useState({
    name: "",
    price: "",
    sellerType: "noon",
  });

  const [productImage, setProductImage] = useState(null);
  const [editingProductId, setEditingProductId] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [supervisorForm, setSupervisorForm] = useState({
    name: "",
    email: "",
    username: "",
  });

  function notify(text) {
    setMessage(text);
  }

  function goTo(nextSection) {
    setSection(nextSection);
    setSearch("");
    setMessage("");
    setSelectedCustomer(null);
    setSelectedPayment(null);
  }

  async function refresh() {
    const jobs = [
      [listProducts, setProducts],
      [() => listCustomers(false), setCustomers],
      [() => listCustomers(true), setArchived],
      [listPayments, setPayments],
      [listSupervisors, setSupervisors],
      [listBanks, setBanks],
    ];
    const errors = [];
    await Promise.all(
      jobs.map(async ([loader, setter]) => {
        try {
          setter(await loader());
        } catch (error) {
          errors.push(error.message || "Could not load records.");
        }
      })
    );
    if (errors.length) notify(errors[0]);
  }

  useEffect(() => {
    refresh();
  }, []);

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  );

  const approvedPayments = payments.filter(
    (payment) => payment.status === "approved"
  );

  const collected = approvedPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const outstanding = customers.reduce((total, customer) => {
    const paidCount = (customer.paidMonths || []).length;
    const instalmentLeft = Math.max(
      0,
      Number(customer.remainingAmount || 0) -
        paidCount * Number(customer.monthlyAmount || 0)
    );
    const downLeft = customer.paidDownPayment
      ? 0
      : Number(customer.downPayment || 0);
    return total + instalmentLeft + downLeft;
  }, 0);

  const filteredCustomers = useMemo(() => {
    const query = search.toLowerCase().trim();
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

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return products;

    return products.filter((product) =>
      `${product.name} ${product.sellerType}`
        .toLowerCase()
        .includes(query)
    );
  }, [products, search]);

  async function removeCustomer(customer) {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await deleteCustomer(customer.id);
      setSelectedCustomer(null);
      await refresh();
      notify("Customer deleted.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function archiveCustomer(customer) {
    if (!window.confirm(`Archive ${customer.name}'s record?`)) return;
    try {
      await setCustomerArchived(customer.id, true);
      setSelectedCustomer(null);
      await refresh();
      notify("Customer record archived.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function restoreCustomer(customer) {
    try {
      await setCustomerArchived(customer.id, false);
      await refresh();
      notify("Customer record restored.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function updatePaymentStatus(payment, status) {
    try {
      await reviewPayment(payment.id, status);
      setSelectedPayment(null);
      await refresh();
      notify(`Payment ${status}.`);
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeProduct(product) {
    const isAssigned = customers.some((customer) =>
      (customer.products || []).some((item) => item.id === product.id)
    );

    if (isAssigned) {
      notify("This product is assigned to a customer and cannot be removed.");
      return;
    }

    if (!window.confirm(`Remove "${product.name}"?`)) return;

    try {
      await deactivateProduct(product.id);
      setProducts((previous) =>
        previous.filter((item) => item.id !== product.id)
      );
      notify("Product removed from the catalogue.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function addProduct(event) {
    event.preventDefault();

    const name = productForm.name.trim();
    const price = Number(productForm.price);

    if (!name || !Number.isFinite(price) || price <= 0) {
      notify("Enter a valid product name and price.");
      return;
    }

    try {
      if (editingProductId) {
        const saved = await updateProduct({
          id: editingProductId,
          name,
          price,
          sellerType: productForm.sellerType,
        });
        setProducts((previous) =>
          previous.map((item) => (item.id === saved.id ? { ...item, ...saved } : item))
        );
        setEditingProductId("");
        notify("Product updated.");
      } else {
        const saved = await saveProduct({
          name,
          price,
          sellerType: productForm.sellerType,
          file: productImage,
        });
        setProducts((previous) => [saved, ...previous]);
        notify("Product saved.");
      }
      setProductForm({
        name: "",
        price: "",
        sellerType: "noon",
      });
      setProductImage(null);
    } catch (error) {
      notify(error.message || "Product could not be saved.");
    }
  }

  async function addBankAccount(event) {
    event.preventDefault();
    if (!bankForm.bankName.trim() || !bankForm.accountName.trim() || !bankForm.iban.trim()) {
      notify("Enter the bank name, account name, and IBAN.");
      return;
    }
    try {
      await saveBank(bankForm);
      setBankForm({
        bankName: "",
        accountName: "",
        iban: "",
        instructions: "",
        qrFile: null,
      });
      await refresh();
      notify("Bank account saved.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function removeBank(bank) {
    if (!window.confirm(`Remove ${bank.bankName}?`)) return;
    try {
      await deactivateBank(bank.id);
      await refresh();
      notify("Bank account removed.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function addSupervisor(event) {
    event.preventDefault();
    const name = supervisorForm.name.trim();
    const username = supervisorForm.username.trim();
    if (!name || !username) {
      notify("Enter a supervisor name and username.");
      return;
    }
    try {
      await saveSupervisor({
        name,
        username,
        email: supervisorForm.email,
      });
      setSupervisorForm({ name: "", email: "", username: "" });
      await refresh();
      notify("Supervisor record added. Login remains the supervisor code.");
    } catch (error) {
      notify(error.message);
    }
  }

  async function deleteSupervisor(supervisor) {
    if (!window.confirm(`Remove ${supervisor.name}?`)) return;
    try {
      await removeSupervisorRecord(supervisor.id);
      await refresh();
      notify("Supervisor record removed.");
    } catch (error) {
      notify(error.message);
    }
  }

  function exportCustomers() {
    const rows = [
      [
        "Customer ID",
        "Name",
        "Phone",
        "Product",
        "Product Price",
        "Down Payment",
        "Remaining",
        "Duration Months",
        "Monthly Instalment",
        "Payment Method",
      ],
      ...customers.map((customer) => [
        customer.customerId,
        customer.name,
        customer.phone,
        customer.productName,
        customer.productPrice,
        customer.downPayment,
        customer.remainingAmount,
        customer.duration,
        customer.monthlyAmount,
        customer.paymentMethod,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "noon-customer-records.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "customers", label: "Customers", icon: Users },
    { id: "add-customer", label: "Add Customer", icon: UserPlus },
    { id: "products", label: "Products", icon: Package },
    { id: "add-product", label: "Add Product", icon: ImagePlus },
    { id: "payments", label: "Payment Approvals", icon: CreditCard },
    { id: "settings", label: "Bank Accounts", icon: Landmark },
    { id: "supervisors", label: "Supervisor Management", icon: UserCog },
    { id: "archived", label: "Archived Records", icon: Archive },
    { id: "reports", label: "Reports", icon: ChartNoAxesCombined },
  ];

  const title =
    navItems.find((item) => item.id === section)?.label ||
    "Admin Dashboard";

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <NoonLogo className="admin-logo noon-logo" />
          <span>
            <strong>NOON INSTALMENT</strong>
            <small>ADMIN CONTROL CENTER</small>
          </span>
        </div>

        <div className="admin-top-actions">
          <button
            type="button"
            className="admin-notification"
            title="Pending payments"
            onClick={() => goTo("payments")}
          >
            <Bell size={19} />
            {pendingPayments.length > 0 && (
              <span className="admin-notification-dot" />
            )}
          </button>

          <button
            type="button"
            className="admin-logout"
            onClick={onLogout}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-label">MAIN MENU</div>

          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${
                  section === item.id ? "active" : ""
                }`}
                onClick={() => goTo(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>

                {item.id === "payments" &&
                  pendingPayments.length > 0 && (
                    <small>{pendingPayments.length}</small>
                  )}
              </button>
            );
          })}

          <div className="admin-sidebar-footer">
            <ShieldCheck size={16} />
            <span>Administration</span>
          </div>
        </aside>

        <main className="admin-content">
          <div className="admin-heading">
            <div>
              <div className="admin-breadcrumb">
                ADMIN / {title.toUpperCase()}
              </div>
              <h1>{title}</h1>
              <p>
                Manage customers, products, instalments and payments.
              </p>
            </div>

            {section === "customers" && (
              <div className="admin-heading-actions">
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => goTo("add-customer")}
                >
                  <UserPlus size={17} />
                  Add Customer
                </button>
                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={exportCustomers}
                >
                  <Save size={17} />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className="admin-message" role="status">
              <span>{message}</span>
              <button
                type="button"
                onClick={() => setMessage("")}
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {/* DASHBOARD */}
          {section === "dashboard" && (
            <>
              <div className="admin-stat-grid">
                <StatCard
                  icon={Users}
                  label="Total Customers"
                  value={customers.length}
                  note="Saved customer records"
                />

                <StatCard
                  icon={Package}
                  label="Products"
                  value={products.length}
                  note="Available products"
                />

                <StatCard
                  icon={CreditCard}
                  label="Pending Payments"
                  value={pendingPayments.length}
                  note="Awaiting review"
                />

                <StatCard
                  icon={Wallet}
                  label="Payments Received"
                  value={`${money(collected)} ر.س`}
                  note="Approved recorded payments"
                />
              </div>

              <div className="admin-secondary-stats">
                <div>
                  <span>Outstanding Balance Estimate</span>
                  <strong>{money(outstanding)} ر.س</strong>
                </div>

                <div>
                  <span>Archived Records</span>
                  <strong>{archived.length}</strong>
                </div>

                <div>
                  <span>Supervisors</span>
                  <strong>{supervisors.length}</strong>
                </div>
              </div>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Management</h2>
                    <p>Access all system management tools.</p>
                  </div>
                </div>

                <div className="admin-management-grid">
                  {navItems
                    .filter((item) => item.id !== "dashboard")
                    .map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          type="button"
                          key={item.id}
                          className="admin-management-card"
                          onClick={() => goTo(item.id)}
                        >
                          <Icon size={20} />
                          <strong>{item.label}</strong>
                          <span>
                            {item.id === "customers" &&
                              "View and manage customer records"}
                            {item.id === "add-customer" &&
                              "Create a customer and instalment plan"}
                            {item.id === "products" &&
                              "View and manage products"}
                            {item.id === "add-product" &&
                              "Create a new product"}
                            {item.id === "payments" &&
                              "Review payment records"}
                            {item.id === "settings" &&
                              "Add bank accounts for customers"}
                            {item.id === "supervisors" &&
                              "Manage supervisor records"}
                            {item.id === "archived" &&
                              "Review and restore archived records"}
                            {item.id === "reports" &&
                              "Review balances and collections"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </section>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Recent Customers</h2>
                    <p>Latest customer records.</p>
                  </div>

                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() => goTo("customers")}
                  >
                    View All
                  </button>
                </div>

                <CustomerTable
                  customers={customers.slice(0, 5)}
                  onView={setSelectedCustomer}
                  onArchive={archiveCustomer}
                  onDelete={removeCustomer}
                  onEdit={setEditingCustomer}
                />
              </section>
            </>
          )}

          {/* CUSTOMERS */}
          {section === "customers" && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Customer Records</h2>
                  <p>
                    {customers.length} active customer record(s)
                  </p>
                </div>
              </div>

              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search by ID, name, phone, or product"
              />

              <CustomerTable
                customers={filteredCustomers}
                onView={setSelectedCustomer}
                onArchive={archiveCustomer}
                onDelete={removeCustomer}
                onEdit={setEditingCustomer}
              />
            </section>
          )}

          {section === "add-customer" && (
            <section className="admin-card admin-form-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Add Customer</h2>
                  <p>
                    A unique 14-digit customer code is created when you save.
                  </p>
                </div>
              </div>
              <CustomerPlanForm
                tone="admin"
                products={products}
                banks={banks}
                createdBy="admin"
                onSaved={refresh}
              />
            </section>
          )}

          {/* PRODUCTS */}
          {section === "products" && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Product Catalogue</h2>
                  <p>{products.length} product(s)</p>
                </div>

                <button
                  type="button"
                  className="admin-primary-button"
                  onClick={() => goTo("add-product")}
                >
                  <Plus size={17} />
                  Add Product
                </button>
              </div>

              <SearchBox
                value={search}
                onChange={setSearch}
                placeholder="Search products"
              />

              <div className="admin-product-grid">
                {filteredProducts.map((product) => (
                  <article
                    className="admin-product-card"
                    key={product.id}
                  >
                    <div className="admin-product-image">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                        />
                      ) : (
                        <Package size={34} />
                      )}
                    </div>

                    <div className="admin-product-info">
                      <strong>{product.name}</strong>

                      {product.sellerType === "noon" ? (
                        <span className="admin-seller-noon">
                          Sold by Noon <BadgeCheck size={14} />
                        </span>
                      ) : (
                        <span className="admin-seller-normal">
                          Normal Product
                        </span>
                      )}

                      <b>{money(product.price)} ر.س</b>

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => {
                          setEditingProductId(product.id);
                          setProductForm({
                            name: product.name,
                            price: String(product.price),
                            sellerType: product.sellerType || "noon",
                          });
                          goTo("add-product");
                        }}
                      >
                        <Pencil size={15} />
                        Edit Product
                      </button>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => removeProduct(product)}
                      >
                        <Trash2 size={15} />
                        Remove Product
                      </button>
                    </div>
                  </article>
                ))}

                {filteredProducts.length === 0 && (
                  <EmptyState
                    icon={Package}
                    title="No products found"
                    text="Add a product or change your search."
                  />
                )}
              </div>
            </section>
          )}

          {/* ADD PRODUCT */}
          {section === "add-product" && (
            <section className="admin-card admin-form-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Add New Product</h2>
                  <p>Create a product for the shared catalogue.</p>
                </div>
              </div>

              <form className="admin-form" onSubmit={addProduct}>
                <label>
                  Product Name *
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter product name"
                  />
                </label>

                <label>
                  Product Price (ر.س) *
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        price: e.target.value,
                      }))
                    }
                    placeholder="Enter price"
                  />
                </label>

                <label>
                  Seller Type *
                  <select
                    value={productForm.sellerType}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        sellerType: e.target.value,
                      }))
                    }
                  >
                    <option value="noon">Sold by Noon</option>
                    <option value="normal">Normal Product</option>
                  </select>
                </label>

                <label>
                  Product Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setProductImage(e.target.files?.[0] || null)
                    }
                  />
                </label>

                <button
                  type="submit"
                  className="admin-primary-button"
                >
                  <Plus size={17} />
                  {editingProductId ? "Update Product" : "Save Product"}
                </button>
              </form>
            </section>
          )}

          {/* PAYMENT APPROVALS */}
          {section === "payments" && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Payment Approvals</h2>
                  <p>
                    Review and update recorded payment submissions.
                  </p>
                </div>
              </div>

              <div className="admin-payment-tabs">
                <span>Pending: {pendingPayments.length}</span>
                <span>Approved: {approvedPayments.length}</span>
              </div>

              {payments.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No payment submissions"
                  text="Payment submissions will appear here once connected to a payment workflow."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            {payment.customerId || "Not linked"}
                          </td>
                          <td>
                            {payment.kind === "down_payment"
                              ? "Down payment"
                              : `Month ${payment.month || ""}`}
                          </td>
                          <td>{money(payment.amount)} ر.س</td>

                          <td>
                            {payment.method || "Not specified"}
                          </td>

                          <td>
                            <span
                              className={`admin-status status-${payment.status}`}
                            >
                              {payment.status}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-small-button"
                              onClick={() =>
                                setSelectedPayment(payment)
                              }
                            >
                              <Eye size={15} />
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {section === "settings" && (
            <>
              <section className="admin-card admin-form-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Add Bank Account</h2>
                    <p>This account can be assigned to a customer.</p>
                  </div>
                </div>
                <form className="admin-form" onSubmit={addBankAccount}>
                  <label>
                    Bank Name *
                    <input
                      required
                      value={bankForm.bankName}
                      onChange={(e) =>
                        setBankForm((current) => ({
                          ...current,
                          bankName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Account Name *
                    <input
                      required
                      value={bankForm.accountName}
                      onChange={(e) =>
                        setBankForm((current) => ({
                          ...current,
                          accountName: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    IBAN *
                    <input
                      required
                      value={bankForm.iban}
                      onChange={(e) =>
                        setBankForm((current) => ({
                          ...current,
                          iban: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Instructions
                    <textarea
                      value={bankForm.instructions}
                      onChange={(e) =>
                        setBankForm((current) => ({
                          ...current,
                          instructions: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    QR code
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setBankForm((current) => ({
                          ...current,
                          qrFile: e.target.files?.[0] || null,
                        }))
                      }
                    />
                  </label>
                  <button type="submit" className="admin-primary-button">
                    <Save size={17} />
                    Save Bank Account
                  </button>
                </form>
              </section>
              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>Bank Accounts</h2>
                </div>
                {banks.length === 0 ? (
                  <EmptyState
                    icon={Landmark}
                    title="No bank accounts"
                    text="Add a bank account before creating a customer."
                  />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Bank</th>
                          <th>Account Name</th>
                          <th>IBAN</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {banks.map((bank) => (
                          <tr key={bank.id}>
                            <td>{bank.bankName}</td>
                            <td>{bank.accountName}</td>
                            <td>{bank.iban}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-danger-button"
                                onClick={() => removeBank(bank)}
                              >
                                <Trash2 size={15} />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* SUPERVISOR MANAGEMENT */}
          {section === "supervisors" && (
            <>
              <section className="admin-card admin-form-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Add Supervisor Record</h2>
                    <p>Create a supervisor directory entry.</p>
                  </div>
                </div>

                <form
                  className="admin-form"
                  onSubmit={addSupervisor}
                >
                  <label>
                    Full Name *
                    <input
                      required
                      value={supervisorForm.name}
                      onChange={(e) =>
                        setSupervisorForm((p) => ({
                          ...p,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Supervisor name"
                    />
                  </label>

                  <label>
                    Username *
                    <input
                      required
                      value={supervisorForm.username}
                      onChange={(e) =>
                        setSupervisorForm((p) => ({
                          ...p,
                          username: e.target.value,
                        }))
                      }
                      placeholder="Choose a username"
                    />
                  </label>

                  <label>
                    Email
                    <input
                      type="email"
                      value={supervisorForm.email}
                      onChange={(e) =>
                        setSupervisorForm((p) => ({
                          ...p,
                          email: e.target.value,
                        }))
                      }
                      placeholder="name@example.com"
                    />
                  </label>

                  <button
                    type="submit"
                    className="admin-primary-button"
                  >
                    <Plus size={17} />
                    Add Supervisor Record
                  </button>
                </form>
              </section>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>Supervisor Records</h2>
                </div>

                {supervisors.length === 0 ? (
                  <EmptyState
                    icon={UserCog}
                    title="No supervisor records"
                    text="Add a supervisor record using the form above."
                  />
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {supervisors.map((supervisor) => (
                          <tr key={supervisor.id}>
                            <td>{supervisor.name}</td>
                            <td>{supervisor.username}</td>
                            <td>{supervisor.email || "—"}</td>
                            <td>
                              <button
                                type="button"
                                className="admin-danger-button"
                                onClick={() =>
                                  deleteSupervisor(supervisor)
                                }
                              >
                                <Trash2 size={15} />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ARCHIVED RECORDS */}
          {section === "archived" && (
            <section className="admin-card">
              <div className="admin-card-heading">
                <div>
                  <h2>Archived Records</h2>
                  <p>
                    {archived.length} archived customer record(s)
                  </p>
                </div>
              </div>

              {archived.length === 0 ? (
                <EmptyState
                  icon={Archive}
                  title="No archived records"
                  text="Archived customers will appear here."
                />
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Product</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {archived.map((customer) => (
                        <tr key={customer.customerId}>
                          <td>{customer.customerId}</td>
                          <td>{customer.name}</td>
                          <td>{customer.phone}</td>
                          <td>{customer.productName}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-small-button"
                              onClick={() =>
                                restoreCustomer(customer)
                              }
                            >
                              <RotateCcw size={15} />
                              Restore
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* REPORTS */}
          {section === "reports" && (
            <>
              <div className="admin-stat-grid">
                <StatCard
                  icon={DollarSign}
                  label="Approved Payments"
                  value={`${money(collected)} ر.س`}
                  note="Sum of approved payment records"
                />

                <StatCard
                  icon={Wallet}
                  label="Estimated Outstanding"
                  value={`${money(outstanding)} ر.س`}
                  note="Estimate from current customer records"
                />

                <StatCard
                  icon={Users}
                  label="Active Customers"
                  value={customers.length}
                  note="Current active records"
                />

                <StatCard
                  icon={Archive}
                  label="Archived Customers"
                  value={archived.length}
                  note="Records available for restoration"
                />
              </div>

              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <h2>Customer Instalment Report</h2>
                    <p>
                      Current saved customer instalment information.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={exportCustomers}
                  >
                    <Save size={17} />
                    Export CSV
                  </button>
                </div>

                <CustomerTable
                  customers={customers}
                  onView={setSelectedCustomer}
                  onArchive={archiveCustomer}
                  onDelete={removeCustomer}
                  onEdit={setEditingCustomer}
                />
              </section>
            </>
          )}

        </main>
      </div>

      {editingCustomer && (
        <div className="admin-modal-backdrop" onClick={() => setEditingCustomer(null)}>
          <form
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const methods = [
                form.get("payBank") ? "bank" : "",
                form.get("payCard") ? "card" : "",
              ].filter(Boolean);
              if (!methods.length) {
                notify("Select at least one payment method.");
                return;
              }
              try {
                await updateCustomerDetails({
                  id: editingCustomer.id,
                  name: String(form.get("name") || ""),
                  phone: String(form.get("phone") || ""),
                  locationPin: String(form.get("locationPin") || ""),
                  paymentMethod: methods.join(","),
                });
                setEditingCustomer(null);
                await refresh();
                notify("Customer updated.");
              } catch (error) {
                notify(error.message);
              }
            }}
          >
            <h2>Edit customer</h2>
            <label>
              Name
              <input name="name" defaultValue={editingCustomer.name} required />
            </label>
            <label>
              Mobile
              <input name="phone" defaultValue={editingCustomer.phone} required />
            </label>
            <label>
              Location
              <input name="locationPin" defaultValue={editingCustomer.locationPin} />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                name="payBank"
                defaultChecked={
                  !editingCustomer.paymentMethods?.length ||
                  editingCustomer.paymentMethods.includes("bank")
                }
              />
              Bank Transfer
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                name="payCard"
                defaultChecked={editingCustomer.paymentMethods?.includes("card")}
              />
              Credit/Debit Card
            </label>
            <div className="admin-modal-actions">
              <button type="button" className="admin-secondary-button" onClick={() => setEditingCustomer(null)}>
                Cancel
              </button>
              <button type="submit" className="admin-primary-button">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOMER DETAILS MODAL */}
      {selectedCustomer && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-heading">
              <h2>Customer Details</h2>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close"
              >
                <XCircle size={23} />
              </button>
            </div>

            <Detail
              label="Customer ID"
              value={selectedCustomer.customerId}
            />

            <Detail label="Name" value={selectedCustomer.name} />
            <Detail label="Phone" value={selectedCustomer.phone} />

            <Detail
              label="Location"
              value={selectedCustomer.locationPin}
            />

            <Detail
              label="Product"
              value={selectedCustomer.productName}
            />

            <Detail
              label="Total Price"
              value={`${money(selectedCustomer.productPrice)} ر.س`}
            />

            <Detail
              label="Down Payment"
              value={`${money(selectedCustomer.downPayment)} ر.س`}
            />

            <Detail
              label="Remaining"
              value={`${money(selectedCustomer.remainingAmount)} ر.س`}
            />

            <Detail
              label="Duration"
              value={`${selectedCustomer.duration || 0} months`}
            />

            <Detail
              label="Payment Method"
              value={
                selectedCustomer.paymentMethods?.includes("bank") &&
                selectedCustomer.paymentMethods?.includes("card")
                  ? "Bank Transfer, Credit/Debit Card"
                  : selectedCustomer.paymentMethods?.includes("card") ||
                      selectedCustomer.paymentMethod === "card"
                    ? "Credit/Debit Card"
                    : selectedCustomer.paymentMethods?.includes("bank") ||
                        selectedCustomer.paymentMethod === "bank"
                      ? "Bank Transfer"
                      : "Not selected"
              }
            />

            <Detail
              label="Bank Account"
              value={
                selectedCustomer.bank
                  ? `${selectedCustomer.bank.bankName} · ${selectedCustomer.bank.iban}`
                  : "Not assigned"
              }
            />

            <Detail
              label="Monthly Instalment"
              value={`${money(selectedCustomer.monthlyAmount)} ر.س`}
            />

            <Detail
              label="ID Document"
              value={
                selectedCustomer.hasIdDocument ? "Uploaded" : "Not uploaded"
              }
            />

            <button
              type="button"
              className="admin-primary-button admin-modal-link"
              onClick={async () => {
                try {
                  await enableNextInstalment(selectedCustomer.id);
                  await refresh();
                  setSelectedCustomer(null);
                  notify("Next instalment enabled.");
                } catch (error) {
                  notify(error.message);
                }
              }}
            >
              Enable next instalment
            </button>

            {selectedCustomer.locationPin?.startsWith("http") && (
              <a
                className="admin-primary-button admin-modal-link"
                href={selectedCustomer.locationPin}
                target="_blank"
                rel="noreferrer"
              >
                Open Location
              </a>
            )}

            <button
              type="button"
              className="admin-secondary-button admin-modal-close"
              onClick={() => setSelectedCustomer(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT REVIEW MODAL */}
      {selectedPayment && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-heading">
              <h2>Review Payment</h2>
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                aria-label="Close"
              >
                <XCircle size={23} />
              </button>
            </div>

            <Detail
              label="Customer ID"
              value={selectedPayment.customerId}
            />

            <Detail
              label="Amount"
              value={`${money(selectedPayment.amount)} ر.س`}
            />

            <Detail
              label="Type"
              value={
                selectedPayment.kind === "down_payment"
                  ? "Down payment"
                  : `Month ${selectedPayment.month || ""}`
              }
            />

            <Detail
              label="Method"
              value={selectedPayment.method}
            />

            {selectedPayment.cardholderName && (
              <Detail
                label="Cardholder"
                value={selectedPayment.cardholderName}
              />
            )}

            <Detail
              label="Status"
              value={selectedPayment.status}
            />

            {selectedPayment.receiptUrl && (
              <a
                href={selectedPayment.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="admin-secondary-button admin-modal-link"
              >
                View Receipt
              </a>
            )}

            {selectedPayment.status === "pending" && (
              <div className="admin-review-actions">
                <button
                  type="button"
                  className="admin-approve-button"
                  onClick={() =>
                    updatePaymentStatus(selectedPayment, "approved")
                  }
                >
                  <CheckCircle size={17} />
                  Approve
                </button>

                <button
                  type="button"
                  className="admin-reject-button"
                  onClick={() =>
                    updatePaymentStatus(selectedPayment, "rejected")
                  }
                >
                  <XCircle size={17} />
                  Reject
                </button>
              </div>
            )}

            <button
              type="button"
              className="admin-secondary-button admin-modal-close"
              onClick={() => setSelectedPayment(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <footer className="admin-footer">
        <span>NOON INSTALMENT</span>
        <span>ADMIN CONTROL CENTER</span>
        <span>
          <ShieldCheck size={14} />
          Supabase records
        </span>
      </footer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="admin-stat-card">
      <span className="admin-stat-icon">
        <Icon size={21} />
      </span>
      <span className="admin-stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="admin-search">
      <Search size={18} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="admin-empty">
      <Icon size={35} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="admin-detail">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function CustomerTable({ customers, onView, onArchive, onDelete, onEdit }) {
  if (!customers.length) {
    return (
      <EmptyState
        icon={Users}
        title="No customer records"
        text="Customer records will appear here after they are added."
      />
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Product</th>
            <th>Monthly Payment</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer) => (
            <tr key={customer.customerId}>
              <td>{customer.customerId}</td>
              <td>{customer.name}</td>
              <td>{customer.phone}</td>
              <td>{customer.productName}</td>
              <td>{money(customer.monthlyAmount)} ر.س</td>

              <td>
                <div className="admin-table-actions">
                  <button
                    type="button"
                    className="admin-icon-button"
                    title="View details"
                    onClick={() => onView(customer)}
                  >
                    <Eye size={16} />
                  </button>

                  <button
                    type="button"
                    className="admin-icon-button admin-archive-icon"
                    title="Archive customer"
                    onClick={() => onArchive(customer)}
                  >
                    <Archive size={16} />
                  </button>
                  {onEdit && (
                    <button
                      type="button"
                      className="admin-icon-button"
                      title="Edit customer"
                      onClick={() => onEdit(customer)}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="admin-icon-button admin-delete-icon"
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
