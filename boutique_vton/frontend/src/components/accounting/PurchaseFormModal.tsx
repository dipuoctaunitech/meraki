"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Plus, X } from "lucide-react";
import { DateInput } from "@/components/accounting/DateInput";
import { PaymentFields } from "@/components/accounting/PaymentFields";
import {
  PurchaseItemLine,
  type PurchaseLine
} from "@/components/accounting/PurchaseItemLine";
import { Button } from "@/components/ui/Button";
import {
  createAccountingEntry,
  fetchNextInvoiceNumber,
  formatCurrency,
  lookupCustomerByPhone,
  searchCustomersByPhone,
  updateAccountingEntry,
  type AccountingEntry,
  type CustomerMatch,
  type PaymentMethod
} from "@/lib/accounting";
import {
  getSpeechRecognitionCtor,
  transcriptToPersonName,
  transcriptToPhoneDigits
} from "@/lib/speechPhone";

type VoiceField = "phone" | "name";

type PurchaseFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entry?: AccountingEntry | null;
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
  onSaved,
  entry = null
}: PurchaseFormModalProps) {
  const isEditing = Boolean(entry);
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
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [phoneSuggestions, setPhoneSuggestions] = useState<CustomerMatch[]>([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [listeningField, setListeningField] = useState<VoiceField | null>(
    null
  );
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [phoneVoiceHint, setPhoneVoiceHint] = useState<string | null>(null);
  const [nameVoiceHint, setNameVoiceHint] = useState<string | null>(null);
  const skipPhoneSuggestRef = useRef(false);
  const phoneFieldRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<{
    stop: () => void;
    abort: () => void;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setEntryDate(entry.entry_date);
      setCustomerName(entry.customer_name);
      setPhone(entry.phone);
      setLines([
        {
          id: createLineId(),
          name: entry.item_name,
          price: String(entry.item_price),
          quantity: String(entry.quantity)
        }
      ]);
      setIsPaid(entry.is_paid);
      setPaymentMethod(entry.payment_method ?? "");
      setNotes(entry.notes ?? "");
      setInvoiceNumber(entry.invoice_number);
      setPhoneHint(null);
    } else {
      setEntryDate(todayIso());
      setCustomerName("");
      setPhone("");
      setLines([emptyLine()]);
      setIsPaid(false);
      setPaymentMethod("");
      setNotes("");
      setInvoiceNumber(null);
      setPhoneHint(null);
    }
    setError(null);
    setPhoneSuggestions([]);
    setShowPhoneSuggestions(false);
    setListeningField(null);
    setPhoneVoiceHint(null);
    setNameVoiceHint(null);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
  }, [open, entry]);

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    if (open) return;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListeningField(null);
  }, [open]);

  useEffect(() => {
    if (!open || isEditing || !entryDate) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void fetchNextInvoiceNumber(entryDate)
        .then((next) => {
          if (!cancelled) setInvoiceNumber(next);
        })
        .catch(() => {
          if (!cancelled) setInvoiceNumber(null);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, isEditing, entryDate]);

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

  function setFieldVoiceHint(field: VoiceField, message: string | null) {
    if (field === "phone") setPhoneVoiceHint(message);
    else setNameVoiceHint(message);
  }

  function stopVoiceListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListeningField(null);
  }

  function startVoiceListening(field: VoiceField) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setFieldVoiceHint(field, "Voice typing is not supported in this browser.");
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Ctor();
    // Phone works better in Indian English digits; names in Hindi.
    recognition.lang = field === "name" ? "hi-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript || "";
      }
      const isFinal = Boolean(
        event.results[event.results.length - 1]?.isFinal
      );

      if (field === "phone") {
        const digits = transcriptToPhoneDigits(transcript);
        if (!digits) {
          setPhoneVoiceHint("Could not hear a number. Try again.");
          return;
        }
        setPhone(digits);
        setShowPhoneSuggestions(true);
        setPhoneVoiceHint(isFinal ? `Heard: ${digits}` : `Listening… ${digits}`);
        return;
      }

      const name = transcriptToPersonName(transcript);
      if (!name) {
        setNameVoiceHint("Could not hear a name. Try again.");
        return;
      }
      setCustomerName(name);
      setNameVoiceHint(isFinal ? `Heard: ${name}` : `Listening… ${name}`);
    };

    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setFieldVoiceHint(
          field,
          "Microphone permission is blocked for this site."
        );
      } else if (code === "no-speech") {
        setFieldVoiceHint(
          field,
          "No speech detected. Tap the mic and try again."
        );
      } else if (code !== "aborted") {
        setFieldVoiceHint(field, "Could not capture speech. Try again.");
      }
      setListeningField(null);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListeningField(null);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      setListeningField(field);
      setFieldVoiceHint(
        field,
        field === "phone"
          ? "Listening… say the phone number"
          : "Listening… say the name in Hindi (saved in English spelling)"
      );
      recognition.start();
    } catch {
      setListeningField(null);
      recognitionRef.current = null;
      setFieldVoiceHint(field, "Could not start microphone. Try again.");
    }
  }

  function toggleVoiceListening(field: VoiceField) {
    if (listeningField === field) {
      stopVoiceListening();
      setFieldVoiceHint(field, null);
      return;
    }
    if (listeningField && listeningField !== field) {
      setFieldVoiceHint(listeningField, null);
    }
    startVoiceListening(field);
  }

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
    if (digits.length > 0 && (digits.length < 10 || digits.length > 15)) {
      setError("Phone number must be 10 to 15 digits, or leave it blank.");
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
      if (isEditing && entry) {
        const line = validLines[0];
        await updateAccountingEntry(entry.id, {
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
      } else {
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
              {isEditing ? "Edit sale" : "New sale"}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">Date</span>
              <DateInput required value={entryDate} onChange={setEntryDate} />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">Invoice number</span>
              <input
                type="text"
                readOnly
                value={invoiceNumber || "—"}
                className="w-full rounded-xl border border-sand/60 bg-champagne/60 px-3 py-2.5 text-ink outline-none"
              />
              {!isEditing && lines.length > 1 ? (
                <span className="mt-1 block text-xs text-neutral-500">
                  First item uses this number; extra items get the next ones.
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div ref={phoneFieldRef} className="relative block text-sm">
              <span className="mb-1.5 block text-neutral-600">
                Phone number{" "}
                <span className="normal-case tracking-normal text-neutral-400">
                  (optional)
                </span>
              </span>
              <div className="relative">
                <input
                  type="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setShowPhoneSuggestions(true);
                    setPhoneVoiceHint(null);
                  }}
                  onFocus={() => {
                    if (phoneSuggestions.length > 0) {
                      setShowPhoneSuggestions(true);
                    }
                  }}
                  placeholder="Type or tap mic to speak"
                  className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
                />
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={() => toggleVoiceListening("phone")}
                    aria-pressed={listeningField === "phone"}
                    aria-label={
                      listeningField === "phone"
                        ? "Stop voice typing"
                        : "Speak phone number"
                    }
                    className={`absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition ${
                      listeningField === "phone"
                        ? "bg-red-600 text-white"
                        : "bg-champagne text-ink hover:bg-sand/50"
                    }`}
                  >
                    {listeningField === "phone" ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </div>
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
              {phoneVoiceHint ? (
                <span className="mt-1 block text-xs text-sand">
                  {phoneVoiceHint}
                </span>
              ) : phoneHint ? (
                <span className="mt-1 block text-xs text-sand">{phoneHint}</span>
              ) : null}
            </div>
            <div className="block text-sm">
              <span className="mb-1.5 block text-neutral-600">
                Customer name
              </span>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setNameVoiceHint(null);
                  }}
                  placeholder="Type or tap mic to speak"
                  className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
                />
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={() => toggleVoiceListening("name")}
                    aria-pressed={listeningField === "name"}
                    aria-label={
                      listeningField === "name"
                        ? "Stop voice typing"
                        : "Speak customer name"
                    }
                    className={`absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition ${
                      listeningField === "name"
                        ? "bg-red-600 text-white"
                        : "bg-champagne text-ink hover:bg-sand/50"
                    }`}
                  >
                    {listeningField === "name" ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </div>
              {nameVoiceHint ? (
                <span className="mt-1 block text-xs text-sand">
                  {nameVoiceHint}
                </span>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-ink">Items</p>

            {lines.map((line, index) => (
              <PurchaseItemLine
                key={line.id}
                line={line}
                index={index}
                canRemove={!isEditing && lines.length > 1}
                onChange={updateLine}
                onRemove={removeLine}
              />
            ))}

            {!isEditing ? (
              <button
                type="button"
                onClick={addLine}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-ink px-3 py-2.5 text-sm text-ink transition hover:bg-ink hover:text-white sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
            ) : null}

            <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <span className="text-sm text-neutral-600">Sale Total</span>
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
