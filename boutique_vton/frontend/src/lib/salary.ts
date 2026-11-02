import { authHeaders, clearAccountsSession } from "@/lib/auth";

export type SalaryAdvance = {
  id?: number;
  amount: number;
  advance_date: string;
};

export type SalaryRecord = {
  id: number;
  name: string;
  fixed_salary: number;
  miscellaneous: number;
  advances: SalaryAdvance[];
  advance_total: number;
  balance: number;
  created_at: string;
  updated_at: string;
};

export type SalaryRecordInput = {
  name: string;
  fixed_salary: number;
  miscellaneous: number;
  advances: { amount: number; advance_date: string }[];
};

export type SalaryFilters = {
  name?: string;
  date_from?: string;
  date_to?: string;
  sort_order?: "asc" | "desc";
};

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000/api/v1"
  );
}

function toQuery(filters: SalaryFilters): string {
  const params = new URLSearchParams();
  if (filters.name?.trim()) params.set("name", filters.name.trim());
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    ...(init.headers || {}),
    ...authHeaders()
  };
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearAccountsSession();
    throw new Error("Not authenticated");
  }
  return response;
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
    // ignore
  }
  return `Request failed (${response.status})`;
}

export async function searchSalaryNames(
  query: string,
  limit = 8
): Promise<string[]> {
  const cleaned = query.trim();
  if (cleaned.length < 1) return [];
  const params = new URLSearchParams({
    q: cleaned,
    limit: String(limit)
  });
  const response = await apiFetch(
    `${apiBase()}/accounting/salaries/names?${params.toString()}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function listSalaries(
  filters: SalaryFilters = {}
): Promise<SalaryRecord[]> {
  const response = await apiFetch(
    `${apiBase()}/accounting/salaries${toQuery(filters)}`
  );
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function createSalary(
  payload: SalaryRecordInput
): Promise<SalaryRecord> {
  const response = await apiFetch(`${apiBase()}/accounting/salaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function updateSalary(
  salaryId: number,
  payload: SalaryRecordInput
): Promise<SalaryRecord> {
  const response = await apiFetch(`${apiBase()}/accounting/salaries/${salaryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

export async function deleteSalary(salaryId: number): Promise<void> {
  const response = await apiFetch(
    `${apiBase()}/accounting/salaries/${salaryId}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw new Error(await readError(response));
}

export async function downloadSalaryReport(
  filters: SalaryFilters = {}
): Promise<void> {
  const response = await apiFetch(
    `${apiBase()}/accounting/salaries/reports/export${toQuery(filters)}`
  );
  if (!response.ok) throw new Error(await readError(response));
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  anchor.href = url;
  anchor.download = match?.[1] || "salary-report.xlsx";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function calcSalaryBalance(
  fixedSalary: number,
  miscellaneous: number,
  advances: { amount: number }[]
): number {
  const advanceTotal = advances.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  return Math.round((fixedSalary + miscellaneous - advanceTotal) * 100) / 100;
}
