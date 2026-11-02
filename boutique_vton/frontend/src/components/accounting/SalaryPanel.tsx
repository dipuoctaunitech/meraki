"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownUp,
  CalendarRange,
  Download,
  Pencil,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { NameSearchInput } from "@/components/accounting/NameSearchInput";
import { SalaryFormModal } from "@/components/accounting/SalaryFormModal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/accounting";
import {
  deleteSalary,
  downloadSalaryReport,
  listSalaries,
  searchSalaryNames,
  type SalaryRecord
} from "@/lib/salary";

export function SalaryPanel({
  onAuthLost
}: {
  onAuthLost?: () => void;
} = {}) {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchName, setSearchName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setError("From date cannot be after To date.");
        setRecords([]);
        return;
      }
      setRecords(
        await listSalaries({
          name: searchName.trim() || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          sort_order: sortOrder
        })
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load salary records.";
      if (/not authenticated|invalid token|token expired|401/i.test(message)) {
        onAuthLost?.();
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchName, dateFrom, dateTo, sortOrder, onAuthLost]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  async function handleDownload() {
    setError(null);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("From date cannot be after To date.");
      return;
    }
    setDownloading(true);
    try {
      await downloadSalaryReport({
        name: searchName.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_order: sortOrder
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete(record: SalaryRecord) {
    const confirmed = window.confirm(
      `Delete salary record for "${record.name}"?`
    );
    if (!confirmed) return;
    setDeletingId(record.id);
    setError(null);
    try {
      await deleteSalary(record.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const hasDateFilter = Boolean(dateFrom || dateTo);

  return (
    <div className="mt-6 space-y-4 sm:mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">Salary</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Track fixed pay, miscellaneous, and advances per person.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="gap-2 self-start px-4 sm:px-6"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-sand/50 bg-white/60 p-3 sm:p-4">
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
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-transparent px-4 py-2.5 text-sm text-ink transition hover:bg-ink hover:text-white active:bg-ink active:text-white sm:w-auto sm:justify-start"
          >
            <ArrowDownUp className="h-4 w-4" />
            {sortOrder === "asc" ? "A to Z" : "Z to A"}
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

          <NameSearchInput
            value={searchName}
            onChange={setSearchName}
            fetchNames={searchSalaryNames}
            placeholder="Search name"
          />
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
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="inline-flex items-center justify-center gap-1 rounded-full px-3 py-2.5 text-sm text-neutral-600 transition hover:text-ink sm:justify-start"
              >
                <X className="h-4 w-4" />
                Clear dates
              </button>
            ) : null}
            <p className="text-xs text-neutral-500 sm:col-span-2 lg:flex-1">
              Filters by advance dates. Download uses the same filters.
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-sand/50 bg-white/60">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sand/50 text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Fixed Salary</th>
              <th className="px-4 py-3 font-medium">Miscellaneous</th>
              <th className="px-4 py-3 font-medium">Advance</th>
              <th className="px-4 py-3 font-medium">Date of Advance</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  Loading salary records…
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  No salary records for this view. Adjust filters or add new.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const advances =
                  record.advances.length > 0
                    ? record.advances
                    : [{ amount: 0, advance_date: "" }];
                return advances.map((advance, index) => (
                  <tr
                    key={`${record.id}-${advance.id ?? index}`}
                    className="border-b border-sand/30 last:border-0"
                  >
                    {index === 0 ? (
                      <>
                        <td
                          className="px-4 py-3 font-medium text-ink"
                          rowSpan={advances.length}
                        >
                          {record.name}
                        </td>
                        <td className="px-4 py-3" rowSpan={advances.length}>
                          {formatCurrency(record.fixed_salary)}
                        </td>
                        <td className="px-4 py-3" rowSpan={advances.length}>
                          {formatCurrency(record.miscellaneous)}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3">
                      {advance.advance_date
                        ? formatCurrency(advance.amount)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {advance.advance_date || "—"}
                    </td>
                    {index === 0 ? (
                      <>
                        <td
                          className="px-4 py-3 font-medium text-ink"
                          rowSpan={advances.length}
                        >
                          {formatCurrency(record.balance)}
                        </td>
                        <td className="px-4 py-3" rowSpan={advances.length}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(record);
                                setFormOpen(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-ink/5 hover:text-ink"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(record)}
                              disabled={deletingId === record.id}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-neutral-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {deletingId === record.id
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </>
                    ) : null}
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>

      <SalaryFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
        entry={editing}
      />
    </div>
  );
}
