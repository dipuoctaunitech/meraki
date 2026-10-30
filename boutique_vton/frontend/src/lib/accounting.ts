export type EntryType = "credit" | "debit";

export type PaymentMethod =
  | "cash"
  | "gpay"
  | "bank_hdfc"
  | "bank_icici";

export type AccountingEntry = {
  id: number;
  entry_type: EntryType;
  entry_date: string;
  customer_id: number | null;
  customer_name: string;
  phone: string;
  item_name: string;
  item_price: number;
  quantity: number;
  total: number;
  is_paid: boolean;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
};

export type AccountingSummary = {
  credit_total: number;
  debit_total: number;
  paid_total: number;
  unpaid_total: number;
  entry_count: number;
};

export type AccountingEntryInput = {
  entry_type: EntryType;
  entry_date: string;
  customer_name?: string | null;
  phone?: string | null;
  item_name: string;
  item_price: number;
  quantity?: number;
  is_paid: boolean;
  payment_method: PaymentMethod | null;
  notes?: string | null;
};

export type SortOrder = "asc" | "desc";

export type ReportFilters = {
  entry_type?: EntryType | "";
  is_paid?: "" | "true" | "false";
  date_from?: string;
  date_to?: string;
  sort_order?: SortOrder;
};

export const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "gpay", label: "UPI" },
  { value: "bank_hdfc", label: "HDFC Bank Transfer" },
  { value: "bank_icici", label: "UPI Axis" }
];

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000/api/v1"
  );
}

function toQuery(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.entry_type) params.set("entry_type", filters.entry_type);
  if (filters.is_paid === "true" || filters.is_paid === "false") {
    params.set("is_paid", filters.is_paid);
  }
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function readError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((item: { msg?: string }) => item.msg || "Validation error")
        .join(", ");
    }
  } catch {
    // ignore parse errors
  }
  return `Request failed (${response.status})`;
}

export async function createAccountingEntry(
  payload: AccountingEntryInput
): Promise<AccountingEntry> {
  const response = await fetch(`${apiBase()}/accounting/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function deleteAccountingEntry(entryId: number): Promise<void> {
  const response = await fetch(
    `${apiBase()}/accounting/entries/${entryId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error(await readError(response));
}

export async function listAccountingEntries(
  filters: ReportFilters = {}
): Promise<AccountingEntry[]> {
  const response = await fetch(
    `${apiBase()}/accounting/entries${toQuery(filters)}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function getAccountingSummary(
  filters: ReportFilters = {}
): Promise<AccountingSummary> {
  const response = await fetch(
    `${apiBase()}/accounting/summary${toQuery(filters)}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export type CustomerMatch = {
  id: number;
  name: string;
  phone: string;
};

export async function lookupCustomerByPhone(
  phone: string
): Promise<CustomerMatch | null> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const response = await fetch(
    `${apiBase()}/accounting/customers/by-phone/${encodeURIComponent(digits)}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function searchCustomersByPhone(
  query: string,
  limit = 8
): Promise<CustomerMatch[]> {
  const digits = query.replace(/\D/g, "");
  if (digits.length < 3) return [];
  const params = new URLSearchParams({
    q: digits,
    limit: String(limit)
  });
  const response = await fetch(
    `${apiBase()}/accounting/customers?${params.toString()}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export type CatalogItem = {
  id: number;
  name: string;
  price: number;
};

export async function searchCatalogItems(
  query: string,
  limit = 8
): Promise<CatalogItem[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("limit", String(limit));
  const response = await fetch(
    `${apiBase()}/accounting/items?${params.toString()}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function downloadAccountingReport(
  filters: ReportFilters = {}
): Promise<void> {
  const response = await fetch(
    `${apiBase()}/accounting/reports/export${toQuery(filters)}`
  );
  if (!response.ok) throw new Error(await readError(response));

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  anchor.href = url;
  anchor.download = match?.[1] || "accounting-report.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);
}

export function paymentLabel(method: PaymentMethod | null): string {
  if (!method) return "—";
  return PAYMENT_OPTIONS.find((option) => option.value === method)?.label || method;
}
