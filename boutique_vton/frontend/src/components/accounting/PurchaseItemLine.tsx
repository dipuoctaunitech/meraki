"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  formatCurrency,
  searchCatalogItems,
  type CatalogItem
} from "@/lib/accounting";

export type PurchaseLine = {
  id: string;
  name: string;
  price: string;
  quantity: string;
};

type PurchaseItemLineProps = {
  line: PurchaseLine;
  index: number;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<Omit<PurchaseLine, "id">>) => void;
  onRemove: (id: string) => void;
};

export function PurchaseItemLine({
  line,
  index,
  canRemove,
  onChange,
  onRemove
}: PurchaseItemLineProps) {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipSuggestRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  const priceNum = Number(line.price) || 0;
  const qtyNum = Number(line.quantity) || 0;
  const lineTotal = Math.round(priceNum * qtyNum * 100) / 100;

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }

    const query = line.name.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const items = await searchCatalogItems(query);
        setSuggestions(items);
        setShowSuggestions(items.length > 0);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [line.name]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectSuggestion(item: CatalogItem) {
    skipSuggestRef.current = true;
    onChange(line.id, {
      name: item.name,
      price: String(item.price)
    });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div className="rounded-2xl border border-sand/50 bg-white/60 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">Item {index + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(line.id)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-neutral-500 transition hover:bg-white hover:text-ink"
            aria-label={`Remove item ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      <div ref={fieldRef} className="relative block text-sm">
        <label className="block">
          <span className="mb-1.5 block text-neutral-600">Item name</span>
          <input
            type="text"
            required
            autoComplete="off"
            value={line.name}
            onChange={(e) => {
              onChange(line.id, { name: e.target.value });
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
          />
        </label>
        {showSuggestions && suggestions.length > 0 ? (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sand/60 bg-white py-1 shadow-luxury"
          >
            {suggestions.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-ink transition hover:bg-champagne"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                >
                  <span>{item.name}</span>
                  <span className="shrink-0 text-neutral-500">
                    {formatCurrency(item.price)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-neutral-600">Item price</span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={line.price}
            onChange={(e) => onChange(line.id, { price: e.target.value })}
            className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-neutral-600">Quantity</span>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={line.quantity}
            onChange={(e) => onChange(line.id, { quantity: e.target.value })}
            className="w-full rounded-xl border border-sand/60 bg-white px-3 py-2.5 text-ink outline-none focus:border-ink"
          />
        </label>
        <div className="col-span-2 block text-sm sm:col-span-1">
          <span className="mb-1.5 block text-neutral-600">Line total</span>
          <div className="flex min-h-[42px] items-center rounded-xl border border-ink/10 bg-white px-3 py-2">
            <span className="text-base font-medium text-ink">
              {formatCurrency(lineTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
