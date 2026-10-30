"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownUp,
  CalendarRange,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X
} from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { ExpenseFormModal } from "@/components/accounting/ExpenseFormModal";
import { PurchaseFormModal } from "@/components/accounting/PurchaseFormModal";
import { Button } from "@/components/ui/Button";
import {
  deleteAccountingEntry,
  downloadAccountingReport,
  formatCurrency,
  getAccountingSummary,
  listAccountingEntries,
  paymentLabel,
  type AccountingEntry,
  type AccountingSummary,
  type EntryType,
  type ReportFilters,
  type SortOrder
} from "@/lib/accounting";

export default function AccountsPage() {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [tab, setTab] = useState<"all" | EntryType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const activeFilters = useCallback((): ReportFilters => {
    const filters: ReportFilters = {
      sort_order: sortOrder
    };
    if (tab !== "all") filters.entry_type = tab;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    return filters;
  }, [tab, dateFrom, dateTo, sortOrder]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setError("From date cannot be after To date.");
        setEntries([]);
        setSummary(null);
        return;
      }
      const filters = activeFilters();
      const [entryRows, summaryData] = await Promise.all([
        listAccountingEntries(filters),
        getAccountingSummary(filters)
      ]);
      setEntries(entryRows);
      setSummary(summaryData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load accounting data. Is the API running?"
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilters, dateFrom, dateTo]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleDownload() {
    setError(null);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("From date cannot be after To date.");
      return;
    }
    setDownloading(true);
    try {
      await downloadAccountingReport(activeFilters());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function clearDateFilter() {
    setDateFrom("");
    setDateTo("");
  }

  function handleEdit(entry: AccountingEntry) {
    setEditingEntry(entry);
    if (entry.entry_type === "credit") {
      setPurchaseOpen(true);
      setExpenseOpen(false);
    } else {
      setExpenseOpen(true);
      setPurchaseOpen(false);
    }
  }

  function closePurchaseModal() {
    setPurchaseOpen(false);
    setEditingEntry(null);
  }

  function closeExpenseModal() {
    setExpenseOpen(false);
    setEditingEntry(null);
  }

  async function handleDelete(entry: AccountingEntry) {
    const confirmed = window.confirm(
      `Delete this ${entry.entry_type} entry for "${entry.item_name}" (${formatCurrency(entry.total)})?`
    );
    if (!confirmed) return;

    setDeletingId(entry.id);
    setError(null);
    try {
      await deleteAccountingEntry(entry.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  const hasDateFilter = Boolean(dateFrom || dateTo);

  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-12 md:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-sand sm:text-sm">
              Meraki books
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
              Credit & Debit
            </h1>
            <p className="mt-3 max-w-xl text-sm text-neutral-600 sm:text-base">
              Record sales and expenses, filter by date, and download Excel
              reports.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingEntry(null);
                setPurchaseOpen(true);
              }}
              className="col-span-2 gap-2 px-4 sm:col-span-1 sm:px-6"
            >
              <Plus className="h-4 w-4" />
              Sales
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingEntry(null);
                setExpenseOpen(true);
              }}
              className="gap-2 px-4 sm:px-6"
            >
              Expense
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadData()}
              className="gap-2 px-4 sm:px-6"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </div>

        {summary ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:mt-10 lg:grid-cols-4">
            <SummaryTile label="Credit total" value={summary.credit_total} />
            <SummaryTile label="Debit total" value={summary.debit_total} />
            <SummaryTile label="Paid" value={summary.paid_total} />
            <SummaryTile label="Not paid" value={summary.unpaid_total} />
          </div>
        ) : null}

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-sand/60 pb-3 scrollbar-none sm:mt-8 md:mt-10 md:flex-wrap">
          {(
            [
              ["all", "All"],
              ["credit", "Credit"],
              ["debit", "Debit"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`shrink-0 rounded-full border border-ink px-4 py-2 text-sm transition ${
                tab === value
                  ? "bg-ink text-white"
                  : "bg-transparent text-ink hover:bg-ink hover:text-white active:bg-ink active:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sand/50 bg-white/60 p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => setShowDateFilter((prev) => !prev)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink px-4 py-2.5 text-sm transition sm:w-auto sm:justify-start ${
                showDateFilter || hasDateFilter
                  ? "bg-ink text-white"
                  : "bg-transparent text-ink hover:bg-ink hover:text-white active:bg-ink active:text-white"
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              Date filter
              {hasDateFilter ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  On
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() =>
                setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-transparent px-4 py-2.5 text-sm text-ink transition hover:bg-ink hover:text-white active:bg-ink active:text-white sm:w-auto sm:justify-start"
            >
              <ArrowDownUp className="h-4 w-4" />
              {sortOrder === "desc" ? "New to old" : "Old to new"}
            </button>

            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-transparent px-4 py-2.5 text-sm text-ink transition hover:bg-ink hover:text-white active:bg-ink active:text-white disabled:opacity-50 sm:w-auto sm:justify-start"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Downloading…" : "Download report"}
            </button>
          </div>

          {showDateFilter ? (
            <div className="grid gap-3 border-t border-sand/40 pt-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
              <label className="block min-w-0 text-sm sm:flex-1 lg:max-w-[12rem]">
                <span className="mb-1.5 block text-neutral-600">From</span>
                <DateInput
                  value={dateFrom}
                  onChange={setDateFrom}
                  className="w-full cursor-pointer rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
                />
              </label>
              <label className="block min-w-0 text-sm sm:flex-1 lg:max-w-[12rem]">
                <span className="mb-1.5 block text-neutral-600">To</span>
                <DateInput
                  value={dateTo}
                  onChange={setDateTo}
                  className="w-full cursor-pointer rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
                />
              </label>
              {hasDateFilter ? (
                <button
                  type="button"
                  onClick={clearDateFilter}
                  className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-2.5 text-sm text-neutral-600 transition hover:text-ink sm:justify-start"
                >
                  <X className="h-4 w-4" />
                  Clear dates
                </button>
              ) : null}
              <p className="text-xs text-neutral-500 sm:col-span-2 lg:flex-1">
                Applies to the current {tab === "all" ? "All" : tab} tab.
                Download uses the same filters.
              </p>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:mt-6">
            {error}
          </p>
        ) : null}

        {/* Mobile / tablet card list */}
        <div className="mt-4 space-y-3 lg:hidden">
          {loading ? (
            <p className="rounded-2xl border border-sand/50 bg-white/60 px-4 py-10 text-center text-sm text-neutral-500">
              Loading entries…
            </p>
          ) : entries.length === 0 ? (
            <p className="rounded-2xl border border-sand/50 bg-white/60 px-4 py-10 text-center text-sm text-neutral-500">
              No entries for this view. Adjust filters or add a sale /
              expense.
            </p>
          ) : (
            entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                deleting={deletingId === entry.id}
                onEdit={() => handleEdit(entry)}
                onDelete={() => void handleDelete(entry)}
              />
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-sand/50 bg-white/60 lg:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-sand/50 text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Name / Paid to</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Item / Expense</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    Loading entries…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-neutral-500"
                  >
                    No entries for this view. Adjust filters or add a sale /
                    expense.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-sand/30 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      {entry.entry_date}
                    </td>
                    <td className="px-4 py-3 capitalize">{entry.entry_type}</td>
                    <td className="px-4 py-3">{entry.customer_name}</td>
                    <td className="px-4 py-3">{entry.phone || "-"}</td>
                    <td className="px-4 py-3">{entry.item_name}</td>
                    <td className="px-4 py-3">
                      {entry.entry_type === "debit" ? "-" : entry.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatCurrency(entry.total)}
                    </td>
                    <td className="px-4 py-3">
                      {entry.is_paid ? "Paid" : "Not paid"}
                    </td>
                    <td className="px-4 py-3">
                      {paymentLabel(entry.payment_method)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-ink/5 hover:text-ink"
                          aria-label={`Edit ${entry.item_name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(entry)}
                          disabled={deletingId === entry.id}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          aria-label={`Delete ${entry.item_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {deletingId === entry.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <PurchaseFormModal
        open={purchaseOpen}
        onClose={closePurchaseModal}
        onSaved={() => void loadData()}
        entry={
          editingEntry?.entry_type === "credit" ? editingEntry : null
        }
      />
      <ExpenseFormModal
        open={expenseOpen}
        onClose={closeExpenseModal}
        onSaved={() => void loadData()}
        entry={
          editingEntry?.entry_type === "debit" ? editingEntry : null
        }
      />
    </main>
  );
}

function EntryCard({
  entry,
  deleting,
  onEdit,
  onDelete
}: {
  entry: AccountingEntry;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-2xl border border-sand/50 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{entry.item_name}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {entry.entry_date} ·{" "}
            <span className="capitalize">{entry.entry_type}</span>
          </p>
        </div>
        <p className="shrink-0 text-base font-medium text-ink">
          {formatCurrency(entry.total)}
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-neutral-500">Name / Paid to</dt>
          <dd className="truncate text-ink">{entry.customer_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Phone</dt>
          <dd className="truncate text-ink">{entry.phone || "-"}</dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Qty</dt>
          <dd className="text-ink">
            {entry.entry_type === "debit" ? "-" : entry.quantity}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-neutral-500">Paid</dt>
          <dd className="text-ink">
            {entry.is_paid ? "Paid" : "Not paid"}
            {entry.is_paid ? ` · ${paymentLabel(entry.payment_method)}` : ""}
          </dd>
        </div>
      </dl>
      <div className="mt-3 flex justify-end gap-1 border-t border-sand/40 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-neutral-500 transition hover:bg-ink/5 hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand/40 bg-white/70 px-3 py-3 sm:px-5 sm:py-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-sand sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-base font-medium text-ink sm:mt-2 sm:text-xl">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
