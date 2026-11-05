"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Trash2 } from "lucide-react";
import {
  formatCurrency,
  searchCatalogItems,
  type CatalogItem
} from "@/lib/accounting";
import {
  getSpeechRecognitionCtor,
  transcriptToAmount,
  transcriptToItemName,
  transcriptToQuantity
} from "@/lib/speechPhone";

export type PurchaseLine = {
  id: string;
  name: string;
  price: string;
  quantity: string;
};

type VoiceField = "name" | "price" | "quantity" | "total";

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
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listeningField, setListeningField] = useState<VoiceField | null>(
    null
  );
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [totalDraft, setTotalDraft] = useState<string | null>(null);
  const skipSuggestRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<{
    stop: () => void;
    abort: () => void;
  } | null>(null);

  const priceNum = Number(line.price) || 0;
  const qtyNum = Number(line.quantity) || 0;
  const lineTotal = Math.round(priceNum * qtyNum * 100) / 100;
  const totalDisplay =
    totalDraft !== null ? totalDraft : lineTotal ? String(lineTotal) : "";

  useEffect(() => {
    setVoiceSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    // Keep editable total in sync when price/qty change elsewhere.
    setTotalDraft(null);
  }, [line.price, line.quantity]);

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

  function applyLineTotal(raw: string) {
    setTotalDraft(raw);
    const total = Number(raw);
    if (!Number.isFinite(total) || total < 0 || raw.trim() === "") return;
    const qty = Math.max(1, Number(line.quantity) || 1);
    const unitPrice = Math.round((total / qty) * 100) / 100;
    onChange(line.id, {
      quantity: String(qty),
      price: String(unitPrice)
    });
  }

  function stopVoiceListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListeningField(null);
  }

  function startVoiceListening(field: VoiceField) {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceHint("Voice typing is not supported in this browser.");
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Ctor();
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

      if (field === "name") {
        const name = transcriptToItemName(transcript);
        if (!name) {
          setVoiceHint("Could not hear an item name. Try again.");
          return;
        }
        onChange(line.id, { name });
        setShowSuggestions(true);
        setVoiceHint(isFinal ? `Heard: ${name}` : `Listening… ${name}`);
        return;
      }

      if (field === "price") {
        const amount = transcriptToAmount(transcript);
        if (!amount) {
          setVoiceHint("Could not hear a price. Try again.");
          return;
        }
        onChange(line.id, { price: amount });
        setVoiceHint(isFinal ? `Heard: ${amount}` : `Listening… ${amount}`);
        return;
      }

      if (field === "quantity") {
        const qty = transcriptToQuantity(transcript);
        if (!qty) {
          setVoiceHint("Could not hear a quantity. Try again.");
          return;
        }
        onChange(line.id, { quantity: qty });
        setVoiceHint(isFinal ? `Heard: ${qty}` : `Listening… ${qty}`);
        return;
      }

      const amount = transcriptToAmount(transcript);
      if (!amount) {
        setVoiceHint("Could not hear a line total. Try again.");
        return;
      }
      applyLineTotal(amount);
      setVoiceHint(isFinal ? `Heard: ${amount}` : `Listening… ${amount}`);
    };

    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      if (code === "not-allowed" || code === "service-not-allowed") {
        setVoiceHint("Microphone permission is blocked for this site.");
      } else if (code === "no-speech") {
        setVoiceHint("No speech detected. Tap the mic and try again.");
      } else if (code !== "aborted") {
        setVoiceHint("Could not capture speech. Try again.");
      }
      setListeningField(null);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListeningField(null);
      recognitionRef.current = null;
    };

    const prompts: Record<VoiceField, string> = {
      name: "Listening… say the item name",
      price: "Listening… say the item price",
      quantity: "Listening… say the quantity",
      total: "Listening… say the line total"
    };

    try {
      recognitionRef.current = recognition;
      setListeningField(field);
      setVoiceHint(prompts[field]);
      recognition.start();
    } catch {
      setListeningField(null);
      recognitionRef.current = null;
      setVoiceHint("Could not start microphone. Try again.");
    }
  }

  function toggleVoiceListening(field: VoiceField) {
    if (listeningField === field) {
      stopVoiceListening();
      setVoiceHint(null);
      return;
    }
    startVoiceListening(field);
  }

  function MicButton({
    field,
    label
  }: {
    field: VoiceField;
    label: string;
  }) {
    if (!voiceSupported) return null;
    const active = listeningField === field;
    return (
      <button
        type="button"
        onClick={() => toggleVoiceListening(field)}
        aria-pressed={active}
        aria-label={active ? `Stop voice typing for ${label}` : `Speak ${label}`}
        className={`absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition ${
          active
            ? "bg-red-600 text-white"
            : "bg-champagne text-ink hover:bg-sand/50"
        }`}
      >
        {active ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    );
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
          <div className="relative">
            <input
              type="text"
              required
              autoComplete="off"
              value={line.name}
              onChange={(e) => {
                onChange(line.id, { name: e.target.value });
                setShowSuggestions(true);
                setVoiceHint(null);
              }}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Type or tap mic to speak"
              className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
            />
            <MicButton field="name" label="item name" />
          </div>
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
          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={line.price}
              onChange={(e) => {
                onChange(line.id, { price: e.target.value });
                setVoiceHint(null);
              }}
              placeholder="0"
              className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
            />
            <MicButton field="price" label="item price" />
          </div>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-neutral-600">Quantity</span>
          <div className="relative">
            <input
              type="number"
              min={1}
              step={1}
              required
              value={line.quantity}
              onChange={(e) => {
                onChange(line.id, { quantity: e.target.value });
                setVoiceHint(null);
              }}
              placeholder="1"
              className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
            />
            <MicButton field="quantity" label="quantity" />
          </div>
        </label>
        <label className="col-span-2 block text-sm sm:col-span-1">
          <span className="mb-1.5 block text-neutral-600">Line total</span>
          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalDisplay}
              onChange={(e) => {
                applyLineTotal(e.target.value);
                setVoiceHint(null);
              }}
              placeholder="0"
              className="w-full rounded-xl border border-sand/60 bg-white py-2.5 pl-3 pr-12 text-ink outline-none focus:border-ink"
            />
            <MicButton field="total" label="line total" />
          </div>
        </label>
      </div>

      {voiceHint ? (
        <p className="mt-2 text-xs text-sand">{voiceHint}</p>
      ) : totalDraft !== null && lineTotal > 0 ? (
        <p className="mt-2 text-xs text-neutral-500">
          Unit price set to {formatCurrency(priceNum)} × {qtyNum || 1}
        </p>
      ) : null}
    </div>
  );
}
