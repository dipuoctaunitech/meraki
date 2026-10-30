"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { PaymentFields } from "@/components/accounting/PaymentFields";
import { Button } from "@/components/ui/Button";
import {
  createAccountingEntry,
  formatCurrency,
  type PaymentMethod
} from "@/lib/accounting";

const EXPENSE_CATEGORIES = [
  "Electricity bill",
  "Rent",
  "Internet bill",
  "Water bill",
  "Salary",
  "Packaging",
  "Purchase",
  "Misc"
] as const;

type ExpenseFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseFormModal({
  open,
  onClose,
  onSaved
}: ExpenseFormModalProps) {
  const [entryDate, setEntryDate] = useState(todayIso());
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>(
    "Electricity bill"
  );
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEntryDate(todayIso());
    setCategory("Electricity bill");
    setCustomCategory("");
    setAmount("");
    setPaidTo("");
    setIsPaid(false);
    setPaymentMethod("");
    setNotes("");
    setError(null);
  }, [open]);

  if (!open) return null;

  const amountNum = Number(amount) || 0;
  const expenseName =
    category === "Misc" ? customCategory.trim() : category;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!expenseName) {
      setError("Select or enter an expense type.");
      return;
    }
    if (amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (isPaid && !paymentMethod) {
      setError("Select a payment method for paid expenses.");
      return;
    }

    setSaving(true);
    try {
      await createAccountingEntry({
        entry_type: "debit",
        entry_date: entryDate,
        customer_name: paidTo.trim() || "-",
        phone: "",
        item_name: expenseName,
        item_price: amountNum,
        quantity: 1,
        is_paid: isPaid,
        payment_method: isPaid ? (paymentMethod as PaymentMethod) : null,
        notes: notes.trim() || null
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-form-title"
        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-champagne p-4 shadow-luxury sm:max-h-[92vh] sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-sand">
              Debit
            </p>
            <h2
              id="expense-form-title"
              className="mt-1 font-serif text-xl text-ink sm:text-2xl"
            >
              New expense
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Record bills and shop expenses like rent, electricity, or internet.
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm">
            <span className="mb-1.5 block text-neutral-600">Date</span>
            <DateInput
              required
              value={entryDate}
              onChange={setEntryDate}
            />
          </label>

          <fieldset>
            <legend className="mb-2 text-sm text-neutral-600">
              Expense type
            </legend>
            <div className="flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={`rounded-full px-3 py-1.5 text-sm transition ${
                    category === option
                      ? "bg-ink text-white"
                      : "bg-white text-neutral-600 hover:text-ink"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {category === "Misc" ? (
              <input
                type="text"
                required
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Describe the expense"
                className="mt-3 w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
              />
            ) : null}
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <label className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">Amount</span>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
              />
            </label>
            <div className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">Total</span>
              <div className="flex min-h-[42px] items-center rounded-xl border border-ink/10 bg-white px-3 py-2">
                <span className="text-base font-medium text-ink">
                  {formatCurrency(amountNum)}
                </span>
              </div>
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1.5 block text-neutral-600">
              Paid to (optional)
            </span>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="Landlord, BSNL, KSEB…"
              className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </label>

          <PaymentFields
            isPaid={isPaid}
            paymentMethod={paymentMethod}
            onPaidChange={setIsPaid}
            onMethodChange={setPaymentMethod}
          />

          <label className="block text-sm">
            <span className="mb-1.5 block text-neutral-600">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving} className="w-full sm:w-auto">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
