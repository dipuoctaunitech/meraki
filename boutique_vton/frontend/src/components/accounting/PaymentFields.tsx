"use client";

import {
  PAYMENT_OPTIONS,
  type PaymentMethod
} from "@/lib/accounting";

type PaymentFieldsProps = {
  isPaid: boolean;
  paymentMethod: PaymentMethod | "";
  onPaidChange: (paid: boolean) => void;
  onMethodChange: (method: PaymentMethod | "") => void;
};

export function PaymentFields({
  isPaid,
  paymentMethod,
  onPaidChange,
  onMethodChange
}: PaymentFieldsProps) {
  return (
    <div className="rounded-2xl border border-sand/50 bg-white/70 p-4">
      <button
        type="button"
        role="switch"
        aria-checked={isPaid}
        aria-label="Payment status"
        onClick={() => {
          onPaidChange(!isPaid);
          if (isPaid) onMethodChange("");
        }}
        className="-m-1 flex w-[calc(100%+0.5rem)] cursor-pointer items-center justify-between gap-4 rounded-xl p-1 text-left transition hover:bg-white/60"
      >
        <div>
          <p className="text-sm font-medium text-ink">Payment status</p>
          <p className="text-xs text-neutral-500">
            {isPaid ? "Marked as paid" : "Not paid yet"}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`relative h-8 w-14 shrink-0 rounded-full transition ${
            isPaid ? "bg-ink" : "bg-sand/70"
          }`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
              isPaid ? "left-7" : "left-1"
            }`}
          />
        </span>
      </button>

      {isPaid ? (
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm text-neutral-600">
            Payment method
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                  paymentMethod === option.value
                    ? "border-ink bg-ink text-white"
                    : "border-sand/60 bg-champagne text-ink hover:border-ink/40"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={option.value}
                  checked={paymentMethod === option.value}
                  onChange={() => onMethodChange(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          {paymentMethod === "gpay" || paymentMethod === "bank_icici" ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-sand/50 bg-white p-3 sm:p-4">
              <p className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-sand">
                Scan to pay
              </p>
              <img
                src="/gpay-qr.jpg"
                alt="Meraki Boutique UPI QR code — 9916175326@okbizaxis"
                className="mx-auto h-auto w-full max-w-xs object-contain"
              />
              <p className="mt-2 break-all text-center text-xs text-neutral-600">
                UPI ID: 9916175326@okbizaxis
              </p>
            </div>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
