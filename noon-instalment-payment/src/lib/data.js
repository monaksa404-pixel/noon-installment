import { supabase } from "./supabase.js";

const CUSTOMER_CORE = `
  id,
  customer_code,
  name,
  full_name,
  phone,
  mobile,
  city,
  address,
  location_pin,
  id_document_path,
  payment_method,
  created_by,
  archived_at,
  status,
  created_at,
  customer_products (product_id, product_name, price),
  customer_bank_assignments (
    is_active,
    bank_accounts (id, bank_name, account_name, iban, instructions)
  ),
  instalment_contracts (
    id,
    product_id,
    product_name,
    total_amount,
    down_payment,
    remaining_amount,
    duration_months,
    monthly_amount,
    start_date,
    status,
    created_at,
    instalments (id, month_number, amount, due_date, status, paid_at)
  )
`;

const CUSTOMER_SELECT = `
  id,
  customer_code,
  name,
  full_name,
  phone,
  mobile,
  city,
  address,
  location_pin,
  id_document_path,
  payment_method,
  created_by,
  archived_at,
  status,
  created_at,
  customer_products (product_id, product_name, price),
  customer_bank_assignments (
    is_active,
    bank_accounts (id, bank_name, account_name, iban, instructions, qr_path)
  ),
  instalment_contracts (
    id,
    product_id,
    product_name,
    total_amount,
    down_payment,
    remaining_amount,
    duration_months,
    monthly_amount,
    start_date,
    status,
    created_at,
    instalments (id, month_number, amount, due_date, status, paid_at, enabled, enabled_at)
  )
`;

function fail(error) {
  const message = error?.message || "Request failed";
  if (
    /schema cache|could not find the function|does not exist|bucket not found/i.test(
      message
    )
  ) {
    throw new Error(
      "Database setup is missing. Run supabase/schema.sql in the Supabase SQL editor, then try again."
    );
  }
  throw new Error(message);
}

function mapProduct(item) {
  return {
    id: item.id,
    name: item.name,
    price: Number(item.price || 0),
    sellerType:
      item.description === "__seller_type_normal__" ? "normal" : "noon",
    image: item.image_path || "",
    createdAt: item.created_at,
  };
}

function mapBank(item) {
  if (!item) return null;
  const bank = Array.isArray(item) ? item[0] : item;
  if (!bank) return null;
  return {
    id: bank.id,
    bankName: bank.bank_name || "",
    accountName: bank.account_name || "",
    iban: bank.iban || "",
    instructions: bank.instructions || "",
    qrUrl: bank.qr_path
      ? String(bank.qr_path).startsWith("http")
        ? bank.qr_path
        : supabase.storage.from("bank-qr").getPublicUrl(bank.qr_path).data?.publicUrl || ""
      : "",
  };
}

function latestContract(row) {
  const contracts = row.instalment_contracts || [];
  return [...contracts].sort((left, right) =>
    String(right.created_at || "").localeCompare(String(left.created_at || ""))
  )[0];
}

function assignedBank(row) {
  const assignments = row.customer_bank_assignments || [];
  const active = assignments.find((item) => item.is_active !== false) || assignments[0];
  return mapBank(active?.bank_accounts);
}

function mapCustomer(row, idDocument = "", payments = []) {
  const contract = latestContract(row);
  const instalmentRows = contract?.instalments || [];
  const schedule = instalmentRows
    .filter((item) => Number(item.month_number) > 0)
    .sort((left, right) => Number(left.month_number) - Number(right.month_number))
    .map((item) => ({
      id: item.id,
      month: Number(item.month_number),
      amount: Number(item.amount || 0),
      dueDate: item.due_date || "",
      paid: item.status === "paid" || Boolean(item.paid_at),
      enabled: Boolean(item.enabled),
    }));
  const downRow = instalmentRows.find((item) => Number(item.month_number) === 0);
  const products = (row.customer_products || []).map((item) => {
    const catalog = Array.isArray(item.products) ? item.products[0] : item.products;
    const description = catalog?.description || "";
    return {
      id: item.product_id,
      name: item.product_name,
      price: Number(item.price || 0),
      image: catalog?.image_path
        ? String(catalog.image_path).startsWith("http")
          ? catalog.image_path
          : supabase.storage.from("product-images").getPublicUrl(catalog.image_path).data?.publicUrl || ""
        : "",
      sellerType:
        description === "__seller_type_normal__"
          ? "Normal"
          : description === "__seller_type_noon__"
            ? "Sold by Noon"
            : "",
    };
  });
  if (!products.length && contract?.product_name) {
    products.push({
      id: contract.product_id,
      name: contract.product_name,
      price: Number(contract.total_amount || 0),
    });
  }
  const downPayment = Number(contract?.down_payment || 0);

  return {
    id: row.id,
    customerId: row.customer_code,
    name: row.full_name || row.name || "",
    phone: row.mobile || row.phone || "",
    locationPin: row.location_pin || row.address || row.city || "",
    hasIdDocument: Boolean(row.id_document_path),
    idDocument,
    products,
    productId: products[0]?.id || contract?.product_id || "",
    productName: products.map((item) => item.name).filter(Boolean).join(", "),
    productPrice: Number(contract?.total_amount || 0),
    downPayment,
    remainingAmount: Number(contract?.remaining_amount || 0),
    duration: Number(contract?.duration_months || 0),
    monthlyAmount: Number(contract?.monthly_amount || 0),
    paymentMethod: row.payment_method || "bank",
    bankAccountId: assignedBank(row)?.id || "",
    bank: assignedBank(row),
    contractId: contract?.id || "",
    schedule,
    downInstalment: downRow
      ? {
          id: downRow.id,
          amount: Number(downRow.amount || downPayment),
          dueDate: downRow.due_date || "Due now",
          paid: downRow.status === "paid" || Boolean(downRow.paid_at),
          enabled: Boolean(downRow.enabled),
        }
      : null,
    paidDownPayment: downPayment <= 0 || !downRow || downRow.status === "paid" || Boolean(downRow.paid_at),
    paidMonths: schedule.filter((item) => item.paid).map((item) => item.month),
    createdAt: contract?.start_date || row.created_at,
    createdBy: row.created_by || "",
    archivedAt: row.archived_at || "",
    paymentMethods: String(row.payment_method || "bank")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item === "bank" || item === "card"),
    pendingInstalmentIds: (payments || [])
      .filter((item) => item.status === "pending")
      .map((item) => item.instalment_id),
    activity: buildActivity(row, payments),
  };
}

function buildActivity(row, payments) {
  const items = [];
  (payments || []).forEach((payment) => {
    const down = payment.kind === "down_payment";
    if (payment.created_at) {
      items.push({
        id: `${payment.id}-submitted`,
        at: payment.created_at,
        tone: "yellow",
        text: "Payment request submitted",
      });
    }
    if (payment.status === "approved") {
      items.push({
        id: `${payment.id}-approved`,
        at: payment.reviewed_at || payment.created_at,
        tone: "green",
        text: down ? "Down payment paid" : "Monthly instalment paid",
      });
    }
    if (payment.status === "rejected") {
      items.push({
        id: `${payment.id}-rejected`,
        at: payment.reviewed_at || payment.created_at,
        tone: "red",
        text: "Payment rejected",
      });
    }
  });
  (row.instalment_contracts || []).forEach((contract) => {
    (contract.instalments || []).forEach((item) => {
      if (item.enabled && item.enabled_at) {
        items.push({
          id: `${item.id}-enabled`,
          at: item.enabled_at,
          tone: "blue",
          text:
            Number(item.month_number) === 0
              ? "Down payment enabled"
              : `Month ${item.month_number} payment enabled`,
        });
      }
    });
  });
  return items
    .filter((item) => item.at)
    .sort((left, right) => new Date(right.at) - new Date(left.at));
}

function mapPayment(row, receiptUrl = "") {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const instalment = Array.isArray(row.instalments) ? row.instalments[0] : row.instalments;
  const month = instalment ? Number(instalment.month_number) : null;
  return {
    id: row.id,
    customerId: customer?.customer_code || row.customer_code || "",
    customerUuid: row.customer_id,
    kind: row.kind || (month === 0 ? "down_payment" : "instalment"),
    month: month === 0 ? null : month,
    amount: Number(row.amount || 0),
    method: row.payment_method || row.method || "",
    receiptUrl,
    cardholderName: row.cardholder_name || "",
    status: row.status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

async function signedUrl(bucket, path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return String(path);
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 12);
  if (error) return "";
  return data?.signedUrl || "";
}

export function dueLabel(startDate, month) {
  const base = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(base.getTime())) return "Contact admin";
  const date = new Date(base);
  date.setMonth(date.getMonth() + Number(month || 0));
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function paymentTargets(customer) {
  const schedule = customer.schedule?.length
    ? customer.schedule
    : Array.from({ length: Number(customer.duration || 0) }, (_, index) => {
        const month = index + 1;
        return {
          month,
          amount: Number(customer.monthlyAmount || 0),
          dueDate: dueLabel(customer.createdAt, month),
          paid: (customer.paidMonths || []).includes(month),
        };
      });
  const firstUnpaid = schedule.find((item) => !item.paid);
  const nextRow = firstUnpaid?.enabled ? firstUnpaid : null;
  const monthly = Number(customer.monthlyAmount || 0);
  const down = Number(customer.downPayment || 0);
  const nextInstalment = nextRow
    ? {
        kind: "instalment",
        month: nextRow.month,
        amount: Number(nextRow.amount || monthly),
        dueDate: nextRow.dueDate || dueLabel(customer.createdAt, nextRow.month),
        label: `Month ${nextRow.month}`,
        instalmentId: nextRow.id,
      }
    : null;

  const nextDue =
    !customer.paidDownPayment && down > 0 && customer.downInstalment?.enabled
      ? {
          kind: "down_payment",
          month: null,
          amount: Number(customer.downInstalment?.amount || down),
          dueDate: customer.downInstalment?.dueDate || "Due now",
          label: "Down payment",
          instalmentId: customer.downInstalment?.id || null,
        }
      : nextInstalment;

  return { nextDue, nextInstalment };
}

export function portalView(customer) {
  const targets = paymentTargets(customer);
  return {
    id: customer.id,
    code: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    verified: true,
    city: customer.locationPin,
    mapUrl: /^https?:\/\//i.test(customer.locationPin || "")
      ? customer.locationPin
      : "",
    idDocumentUrl: customer.idDocument || "",
    productName: customer.productName,
    products: customer.products || [],
    productPrice: customer.productPrice,
    downPayment: customer.downPayment,
    remainingAmount: customer.remainingAmount,
    duration: customer.duration,
    monthlyAmount: customer.monthlyAmount,
    startDate: String(customer.createdAt || "").slice(0, 10),
    paidDownPayment: customer.paidDownPayment,
    paidMonths: customer.paidMonths || [],
    paymentMethod: customer.paymentMethod,
    paymentMethods: customer.paymentMethods?.length
      ? customer.paymentMethods
      : ["bank"],
    bank: customer.bank,
    activity: customer.activity || [],
    schedule: customer.schedule || [],
    enabledMonths: (customer.schedule || [])
      .filter((item) => item.enabled && !item.paid)
      .map((item) => item.month),
    downEnabled: Boolean(customer.downInstalment?.enabled),
    canPay: Boolean(targets.nextDue?.instalmentId) &&
      !(customer.pendingInstalmentIds || []).includes(targets.nextDue.instalmentId),
    contractId: customer.contractId || "",
    location: customer.locationPin,
    product: customer.productName,
    amount: targets.nextDue?.amount || 0,
    dueDate: targets.nextDue?.dueDate || "No payment due",
    nextDue: targets.nextDue,
    nextInstalment: targets.nextInstalment,
  };
}

export async function notifyDownPayment(payload) {
  const response = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Telegram notification failed");
  }
}

async function uploadToBucket(bucket, file, folder) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${safeExtension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) fail(error);
  return path;
}

export async function listProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price, image_path, is_active, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []).map(mapProduct);
}

export async function saveProduct({ name, price, sellerType, file }) {
  let imagePath = null;
  if (file) {
    const path = await uploadToBucket("product-images", file, "products");
    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    imagePath = publicUrlData.publicUrl;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      price,
      description:
        sellerType === "normal"
          ? "__seller_type_normal__"
          : "__seller_type_noon__",
      image_path: imagePath,
      is_active: true,
    })
    .select("id, name, description, price, image_path, is_active, created_at")
    .single();

  if (error) fail(error);
  return mapProduct(data);
}

export async function deactivateProduct(id) {
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);
  if (error) fail(error);
}

export async function listBanks() {
  let { data, error } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, account_name, iban, instructions, qr_path, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    const retry = await supabase
      .from("bank_accounts")
      .select("id, bank_name, account_name, iban, instructions, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }
  if (error) fail(error);
  return (data || []).map((item) => mapBank(item));
}

export async function saveBank({ bankName, accountName, iban, instructions, qrFile }) {
  let qrPath = null;
  if (qrFile) qrPath = await uploadToBucket("bank-qr", qrFile, "qr");
  const row = {
    bank_name: bankName.trim(),
    account_name: accountName.trim(),
    iban: iban.trim(),
    instructions: instructions.trim(),
    is_active: true,
  };
  if (qrPath) row.qr_path = qrPath;
  const { error } = await supabase.from("bank_accounts").insert(row);
  if (error) fail(error);
}

export async function enableNextInstalment(customerId) {
  const { error } = await supabase.rpc("enable_next_instalment", {
    p_customer_id: customerId,
  });
  if (error) fail(error);
}

export async function deleteCustomer(customerId) {
  const { error } = await supabase.rpc("delete_customer", { p_id: customerId });
  if (error) fail(error);
}

export async function deactivateBank(id) {
  const { error } = await supabase
    .from("bank_accounts")
    .update({ is_active: false })
    .eq("id", id);
  if (error) fail(error);
}

async function attachCatalog(rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const ids = [
    ...new Set(
      list
        .flatMap((row) => row.customer_products || [])
        .map((item) => item.product_id)
        .filter(Boolean)
    ),
  ];
  if (!ids.length) return rows;
  const { data } = await supabase
    .from("products")
    .select("id, image_path, description")
    .in("id", ids);
  const catalog = Object.fromEntries((data || []).map((item) => [item.id, item]));
  const mapped = list.map((row) => ({
    ...row,
    customer_products: (row.customer_products || []).map((item) => ({
      ...item,
      products: item.products || catalog[item.product_id] || null,
    })),
  }));
  return Array.isArray(rows) ? mapped : mapped[0] || null;
}

async function loadCustomerRows(build) {
  let result = await build(CUSTOMER_SELECT);
  if (result.error) result = await build(CUSTOMER_CORE);
  if (result.error) fail(result.error);
  return attachCatalog(result.data || []);
}

async function hydrateCustomers(rows) {
  const ids = (rows || []).map((row) => row.id).filter(Boolean);
  let payments = [];
  if (ids.length) {
    let paymentResult = await supabase
      .from("payments")
      .select("id, customer_id, instalment_id, status, kind, created_at, reviewed_at")
      .in("customer_id", ids);
    if (paymentResult.error) {
      paymentResult = await supabase
        .from("payments")
        .select("id, customer_id, instalment_id, status, created_at, reviewed_at")
        .in("customer_id", ids);
    }
    payments = paymentResult.data || [];
  }
  return Promise.all(
    (rows || []).map(async (row) =>
      mapCustomer(
        row,
        await signedUrl("customer-documents", row.id_document_path),
        payments.filter((item) => item.customer_id === row.id)
      )
    )
  );
}

export async function listCustomers(archived = false) {
  const rows = await loadCustomerRows((columns) => {
    let query = supabase
      .from("customers")
      .select(columns)
      .order("created_at", { ascending: false });
    return archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);
  });
  return hydrateCustomers(rows);
}

export async function getCustomerByCode(code) {
  const rows = await loadCustomerRows((columns) =>
    supabase
      .from("customers")
      .select(columns)
      .eq("customer_code", code)
      .is("archived_at", null)
      .maybeSingle()
  );
  const data = Array.isArray(rows) ? rows[0] : rows;
  if (!data) return null;
  const [mapped] = await hydrateCustomers([data]);
  return mapped;
}

export async function createCustomer({
  name,
  phone,
  locationPin,
  idFile,
  products,
  downPayment,
  duration,
  paymentMethod,
  bankAccountId,
  createdBy,
}) {
  let idDocumentPath = "";
  if (idFile) {
    idDocumentPath = await uploadToBucket("customer-documents", idFile, "ids");
  }

  const { data, error } = await supabase.rpc("create_customer_plan", {
    payload: {
      name,
      phone,
      location_pin: locationPin,
      id_document_path: idDocumentPath,
      payment_method: paymentMethod,
      bank_account_id: bankAccountId,
      down_payment: Number(downPayment),
      duration_months: Number(duration),
      created_by: createdBy,
      products: products.map((item) => ({ id: item.id })),
    },
  });

  if (error) fail(error);
  return data;
}

export async function setCustomerArchived(id, archived) {
  const { error } = await supabase.rpc("set_customer_archived", {
    p_id: id,
    p_archived: archived,
  });
  if (error) fail(error);
}

export async function listPayments() {
  let { data, error } = await supabase
    .from("payments")
    .select(
      "id, customer_id, customer_code, instalment_id, contract_id, amount, payment_method, method, kind, receipt_path, cardholder_name, status, reviewed_at, created_at, customers(customer_code)"
    )
    .order("created_at", { ascending: false });
  if (error) {
    const retry = await supabase
      .from("payments")
      .select(
        "id, customer_id, instalment_id, contract_id, amount, payment_method, receipt_path, cardholder_name, status, reviewed_at, created_at, customers(customer_code)"
      )
      .order("created_at", { ascending: false });
    data = retry.data;
    error = retry.error;
  }
  if (error) fail(error);
  const instalmentIds = [
    ...new Set((data || []).map((row) => row.instalment_id).filter(Boolean)),
  ];
  const months = {};
  if (instalmentIds.length) {
    const { data: instalmentRows } = await supabase
      .from("instalments")
      .select("id, month_number")
      .in("id", instalmentIds);
    for (const item of instalmentRows || []) {
      months[item.id] = Number(item.month_number);
    }
  }
  return Promise.all(
    (data || []).map(async (row) => {
      const month = months[row.instalment_id];
      return mapPayment(
        {
          ...row,
          instalments:
            month === undefined ? null : { month_number: month },
        },
        await signedUrl("payment-receipts", row.receipt_path)
      );
    })
  );
}

export async function createPayment({
  customerUuid,
  customerCode,
  contractId,
  instalmentId,
  amount,
  method,
  receiptFile,
  cardholderName,
  bankAccountId,
}) {
  if (!instalmentId) {
    throw new Error("This payment is not linked to an instalment yet.");
  }

  let code = String(customerCode || "").trim();
  if (!code && customerUuid) {
    const { data: customerRow, error: customerError } = await supabase
      .from("customers")
      .select("customer_code")
      .eq("id", customerUuid)
      .maybeSingle();
    if (customerError) fail(customerError);
    code = customerRow?.customer_code || "";
  }
  if (!code) throw new Error("Customer code is missing.");

  let { data: instalment, error: instalmentError } = await supabase
    .from("instalments")
    .select("id, amount, status, paid_at, contract_id, month_number, enabled")
    .eq("id", instalmentId)
    .maybeSingle();
  if (instalmentError) {
    const retry = await supabase
      .from("instalments")
      .select("id, amount, status, paid_at, contract_id, month_number")
      .eq("id", instalmentId)
      .maybeSingle();
    instalment = retry.data ? { ...retry.data, enabled: true } : null;
    instalmentError = retry.error;
  }

  if (instalmentError) fail(instalmentError);
  if (!instalment) throw new Error("Instalment was not found.");
  if (instalment.status === "paid" || instalment.paid_at) {
    throw new Error("This instalment is already paid.");
  }
  if (!instalment.enabled) {
    throw new Error("This instalment is not enabled yet.");
  }
  if (Math.abs(Number(instalment.amount) - Number(amount)) > 0.009) {
    throw new Error("Amount does not match the instalment.");
  }

  const { data: pending, error: pendingError } = await supabase
    .from("payments")
    .select("id")
    .eq("instalment_id", instalmentId)
    .eq("status", "pending")
    .limit(1);
  if (pendingError) fail(pendingError);
  if (pending?.length) {
    throw new Error(
      "A payment request for this amount is already waiting for admin approval."
    );
  }

  let receiptPath = null;
  if (receiptFile) {
    receiptPath = await uploadToBucket("payment-receipts", receiptFile, "receipts");
  }

  const paymentKind =
    Number(instalment.month_number) === 0 ? "down_payment" : "instalment";

  const { error } = await supabase.from("payments").insert({
    customer_id: customerUuid,
    customer_code: code,
    contract_id: contractId || instalment.contract_id,
    instalment_id: instalmentId,
    amount,
    payment_method: method,
    method,
    kind: paymentKind,
    receipt_path: receiptPath,
    cardholder_name: cardholderName || null,
    bank_account_id: bankAccountId || null,
    status: "pending",
  });

  if (error) fail(error);
}

export async function reviewPayment(id, status) {
  const { error } = await supabase.rpc("review_payment", {
    p_id: id,
    p_status: status,
  });
  if (error) fail(error);
}

export async function listSupervisors() {
  const { data, error } = await supabase
    .from("supervisors")
    .select("id, name, email, username, created_at")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email || "",
    username: item.username,
    createdAt: item.created_at,
  }));
}

export async function saveSupervisor({ name, email, username }) {
  const { error } = await supabase.from("supervisors").insert({
    name: name.trim(),
    email: email.trim(),
    username: username.trim(),
  });
  if (error) fail(error);
}

export async function deleteSupervisor(id) {
  const { error } = await supabase.from("supervisors").delete().eq("id", id);
  if (error) fail(error);
}
