"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/accounting";
import {
  calcSalaryBalance,
  createSalary,
  updateSalary,
  type SalaryRecord
} from "@/lib/salary";

type AdvanceDraft = {
  id: string;
  amount: string;
  advance_date: string;
};

type RowDraft = {
  id: string;
  name: string;
  fixed_salary: string;
  miscellaneous: string;
  advances: AdvanceDraft[];
};

type SalaryFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entry?: SalaryRecord | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyAdvance(): AdvanceDraft {
  return { id: createId(), amount: "", advance_date: todayIso() };
}

function emptyRow(): RowDraft {
  return {
    id: createId(),
    name: "",
    fixed_salary: "",
    miscellaneous: "0",
    advances: [emptyAdvance()]
  };
}

function rowFromEntry(entry: SalaryRecord): RowDraft {
  return {
    id: createId(),
    name: entry.name,
    fixed_salary: String(entry.fixed_salary),
    miscellaneous: String(entry.miscellaneous),
    advances:
      entry.advances.length > 0
        ? entry.advances.map((item) => ({
            id: createId(),
            amount: String(item.amount),
            advance_date: item.advance_date
          }))
        : [emptyAdvance()]
  };
}

export function SalaryFormModal({
  open,
  onClose,
  onSaved,
  entry = null
}: SalaryFormModalProps) {
  const isEditing = Boolean(entry);
  const [rows, setRows] = useState<RowDraft[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRows(entry ? [rowFromEntry(entry)] : [emptyRow()]);
    setError(null);
  }, [open, entry]);

  if (!open) return null;

  function updateRow(rowId: string, patch: Partial<Omit<RowDraft, "id" | "advances">>) {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  function updateAdvance(
    rowId: string,
    advanceId: string,
    patch: Partial<Omit<AdvanceDraft, "id">>
  ) {
    setRows((prev) =>
      prev.map((row) =>
        row.id !== rowId
          ? row
          : {
              ...row,
              advances: row.advances.map((advance) =>
                advance.id === advanceId ? { ...advance, ...patch } : advance
              )
            }
      )
    );
  }

  function addAdvance(rowId: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, advances: [...row.advances, emptyAdvance()] }
          : row
      )
    );
  }

  function removeAdvance(rowId: string, advanceId: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        if (row.advances.length <= 1) {
          return {
            ...row,
            advances: [{ id: createId(), amount: "", advance_date: todayIso() }]
          };
        }
        return {
          ...row,
          advances: row.advances.filter((advance) => advance.id !== advanceId)
        };
      })
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const payloads = rows.map((row) => {
      const advances = row.advances
        .filter((advance) => Number(advance.amount) > 0)
        .map((advance) => ({
          amount: Number(advance.amount),
          advance_date: advance.advance_date
        }));
      return {
        name: row.name.trim(),
        fixed_salary: Number(row.fixed_salary) || 0,
        miscellaneous: Number(row.miscellaneous) || 0,
        advances
      };
    });

    if (payloads.some((row) => !row.name)) {
      setError("Every row needs a name.");
      return;
    }
    if (payloads.some((row) => row.fixed_salary < 0 || row.miscellaneous < 0)) {
      setError("Salary amounts cannot be negative.");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && entry) {
        await updateSalary(entry.id, payloads[0]);
      } else {
        for (const payload of payloads) {
          await createSalary(payload);
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save salary");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="salary-form-title"
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-champagne shadow-luxury sm:max-h-[92vh] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-sand/50 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-sand">
              Payroll
            </p>
            <h2
              id="salary-form-title"
              className="mt-1 font-serif text-xl text-ink sm:text-2xl"
            >
              {isEditing ? "Edit salary" : "Add salary"}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Balance = Fixed salary + Miscellaneous − Advances
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-500 transition hover:bg-white hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-4">
            <div className="overflow-x-auto rounded-xl border border-sand/60 bg-white">
              <table className="min-w-[720px] w-full border-collapse text-left text-sm">
                <thead className="bg-champagne/80 text-xs uppercase tracking-wider text-neutral-600">
                  <tr>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Name
                    </th>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Fixed Salary
                    </th>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Miscellaneous
                    </th>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Advance
                    </th>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Date of Advance
                    </th>
                    <th className="border-b border-sand/50 px-3 py-3 font-medium">
                      Balance
                    </th>
                    {!isEditing ? (
                      <th className="border-b border-sand/50 px-3 py-3 font-medium">
                        {" "}
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const balance = calcSalaryBalance(
                      Number(row.fixed_salary) || 0,
                      Number(row.miscellaneous) || 0,
                      row.advances.map((advance) => ({
                        amount: Number(advance.amount) || 0
                      }))
                    );
                    return (
                      <tr key={row.id} className="align-top border-b border-sand/30 last:border-0">
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            required
                            value={row.name}
                            onChange={(e) =>
                              updateRow(row.id, { name: e.target.value })
                            }
                            className="w-full min-w-[8rem] rounded-lg border border-sand/50 bg-white px-2 py-2 text-ink outline-none focus:border-ink"
                            placeholder="Employee name"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            required
                            value={row.fixed_salary}
                            onChange={(e) =>
                              updateRow(row.id, {
                                fixed_salary: e.target.value
                              })
                            }
                            className="w-full min-w-[6rem] rounded-lg border border-sand/50 bg-white px-2 py-2 text-ink outline-none focus:border-ink"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.miscellaneous}
                            onChange={(e) =>
                              updateRow(row.id, {
                                miscellaneous: e.target.value
                              })
                            }
                            className="w-full min-w-[6rem] rounded-lg border border-sand/50 bg-white px-2 py-2 text-ink outline-none focus:border-ink"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="space-y-2">
                            {row.advances.map((advance) => (
                              <div
                                key={advance.id}
                                className="flex items-center gap-1"
                              >
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={advance.amount}
                                  onChange={(e) =>
                                    updateAdvance(row.id, advance.id, {
                                      amount: e.target.value
                                    })
                                  }
                                  className="w-full min-w-[5.5rem] rounded-lg border border-sand/50 bg-white px-2 py-2 text-ink outline-none focus:border-ink"
                                  placeholder="0"
                                />
                                {row.advances.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeAdvance(row.id, advance.id)
                                    }
                                    className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-700"
                                    aria-label="Remove advance"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addAdvance(row.id)}
                              className="inline-flex items-center gap-1 text-xs text-ink hover:underline"
                            >
                              <Plus className="h-3 w-3" />
                              Advance
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="space-y-2">
                            {row.advances.map((advance) => (
                              <DateInput
                                key={`date-${advance.id}`}
                                value={advance.advance_date}
                                onChange={(value) =>
                                  updateAdvance(row.id, advance.id, {
                                    advance_date: value
                                  })
                                }
                                className="w-full min-w-[9rem] cursor-pointer rounded-lg border border-sand/50 bg-white px-2 py-2 text-ink outline-none focus:border-ink"
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-ink">
                            {formatCurrency(balance)}
                          </span>
                        </td>
                        {!isEditing ? (
                          <td className="px-2 py-2">
                            {rows.length > 1 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setRows((prev) =>
                                    prev.filter((item) => item.id !== row.id)
                                  )
                                }
                                className="rounded-full p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-700"
                                aria-label="Remove row"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink px-3 py-2 text-sm text-ink transition hover:bg-ink hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Add row
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-6">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-sand/50 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={saving}
              className="w-full sm:w-auto"
            >
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
