"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { PaymentFields } from "@/components/accounting/PaymentFields";
import {
  PurchaseItemLine,
  type PurchaseLine
} from "@/components/accounting/PurchaseItemLine";
import { Button } from "@/components/ui/Button";
import {
  createAccountingEntry,
  formatCurrency,
  lookupCustomerByPhone,
  searchCustomersByPhone,
  type CustomerMatch,
  type PaymentMethod
} from "@/lib/accounting";

type PurchaseFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function createLineId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyLine(): PurchaseLine {
  return {
    id: createLineId(),
    name: "",
    price: "",
    quantity: "1"
  };
}

export function PurchaseFormModal({
  open,
  onClose,
  onSaved
}: PurchaseFormModalProps) {
  const [entryDate, setEntryDate] = useState(todayIso());
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [phoneSuggestions, setPhoneSuggestions] = useState<CustomerMatch[]>([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const skipPhoneSuggestRef = useRef(false);
  const phoneFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntryDate(todayIso());
    setCustomerName("");
    setPhone("");
    setLines([emptyLine()]);
    setIsPaid(false);
    setPaymentMethod("");
    setNotes("");
    setError(null);
    setPhoneHint(null);
    setPhoneSuggestions([]);
    setShowPhoneSuggestions(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (skipPhoneSuggestRef.current) {
      skipPhoneSuggestRef.current = false;
      return;
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 3) {
      setPhoneSuggestions([]);
      setShowPhoneSuggestions(false);
      setPhoneHint(null);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const matches = await searchCustomersByPhone(digits);
        setPhoneSuggestions(matches);
        setShowPhoneSuggestions(matches.length > 0);

        if (digits.length >= 10) {
          const exact =
            matches.find((match) => match.phone === digits) ||
            (await lookupCustomerByPhone(digits));
          if (exact) {
            setCustomerName(exact.name);
            setPhoneHint("Existing customer — name filled in");
          } else {
            setPhoneHint("New customer — name will be saved with this number");
          }
        } else {
          setPhoneHint(null);
        }
      } catch {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
        setPhoneHint(null);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [phone, open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!phoneFieldRef.current?.contains(event.target as Node)) {
        setShowPhoneSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (!open) return null;

  const grandTotal = lines.reduce((sum, line) => {
    const price = Number(line.price) || 0;
    const qty = Number(line.quantity) || 0;
    return sum + Math.round(price * qty * 100) / 100;
  }, 0);

  function updateLine(id: string, patch: Partial<Omit<PurchaseLine, "id">>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function selectPhoneSuggestion(customer: CustomerMatch) {
    skipPhoneSuggestRef.current = true;
    setPhone(customer.phone);
    setCustomerName(customer.name);
    setPhoneHint("Existing customer — name filled in");
    setPhoneSuggestions([]);
    setShowPhoneSuggestions(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid phone number (at least 10 digits).");
      return;
    }
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    const validLines = lines.map((line) => ({
      name: line.name.trim(),
      price: Number(line.price),
      quantity: Number(line.quantity)
    }));

    if (validLines.some((line) => !line.name)) {
      setError("Every item needs a name.");
      return;
    }
    if (validLines.some((line) => line.price < 0 || line.quantity < 1)) {
      setError("Enter a valid price and quantity for every item.");
      return;
    }
    if (isPaid && !paymentMethod) {
      setError("Select a payment method for paid entries.");
      return;
    }

    setSaving(true);
    try {
      const sharedNotes = notes.trim() || null;
      for (const line of validLines) {
        await createAccountingEntry({
          entry_type: "credit",
          entry_date: entryDate,
          customer_name: customerName.trim(),
          phone: digits,
          item_name: line.name,
          item_price: line.price,
          quantity: line.quantity,
          is_paid: isPaid,
          payment_method: isPaid ? (paymentMethod as PaymentMethod) : null,
          notes: sharedNotes
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-form-title"
        className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-champagne p-4 shadow-luxury sm:max-h-[92vh] sm:rounded-2xl sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-sand">
              Credit
            </p>
            <h2
              id="purchase-form-title"
              className="mt-1 font-serif text-xl text-ink sm:text-2xl"
            >
              New purchase
            </h2>
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
            <DateInput required value={entryDate} onChange={setEntryDate} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div ref={phoneFieldRef} className="relative block text-sm">
              <label className="block">
                <span className="mb-1.5 block text-neutral-600">
                  Phone number
                </span>
                <input
                  type="tel"
                  required
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setShowPhoneSuggestions(true);
                  }}
                  onFocus={() => {
                    if (phoneSuggestions.length > 0) {
                      setShowPhoneSuggestions(true);
                    }
                  }}
                  placeholder="10+ digits"
                  className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
                />
              </label>
              {showPhoneSuggestions && phoneSuggestions.length > 0 ? (
                <ul
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sand/60 bg-white py-1 shadow-luxury"
                >
                  {phoneSuggestions.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        role="option"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition hover:bg-champagne"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectPhoneSuggestion(customer)}
                      >
                        <span className="font-medium">{customer.phone}</span>
                        <span className="truncate text-neutral-500">
                          {customer.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {phoneHint ? (
                <span className="mt-1 block text-xs text-sand">{phoneHint}</span>
              ) : null}
            </div>
            <label className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">
                Customer name
              </span>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Items</p>

            {lines.map((line, index) => (
              <PurchaseItemLine
                key={line.id}
                line={line}
                index={index}
                canRemove={lines.length > 1}
                onChange={updateLine}
                onRemove={removeLine}
              />
            ))}

            <button
              type="button"
              onClick={addLine}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-ink px-3 py-2.5 text-sm text-ink transition hover:bg-ink hover:text-white sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add item
            </button>

            <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <span className="text-sm text-neutral-600">Purchase total</span>
              <span className="text-base font-medium text-ink">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

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
              onClick={onClose}
              className="w-full border border-ink bg-transparent text-ink hover:bg-ink hover:text-white sm:w-auto"
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
