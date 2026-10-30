"use client";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
};

function openPicker(input: HTMLInputElement | null) {
  if (!input) return;
  try {
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  } catch {
    // showPicker can throw if the input is not visible / not user-activated
  }
}

export function DateInput({
  value,
  onChange,
  required,
  className,
  id
}: DateInputProps) {
  return (
    <input
      id={id}
      type="date"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => openPicker(e.currentTarget)}
      onFocus={(e) => openPicker(e.currentTarget)}
      className={
        className ??
        "w-full cursor-pointer rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
      }
    />
  );
}
