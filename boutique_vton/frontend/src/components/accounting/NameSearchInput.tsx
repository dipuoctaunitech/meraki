"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type NameSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  fetchNames: (query: string) => Promise<string[]>;
  placeholder?: string;
  className?: string;
};

export function NameSearchInput({
  value,
  onChange,
  fetchNames,
  placeholder = "Search name",
  className = ""
}: NameSearchInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const skipSuggestRef = useRef(false);
  const rootRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < 1) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      void fetchNames(query)
        .then((names) => {
          if (cancelled) return;
          setSuggestions(names);
          setOpen(names.length > 0);
        })
        .catch(() => {
          if (cancelled) return;
          setSuggestions([]);
          setOpen(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value, fetchNames]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectName(name: string) {
    skipSuggestRef.current = true;
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <label
      ref={rootRef}
      className={`relative w-full sm:min-w-[14rem] sm:flex-1 sm:max-w-xs ${className}`}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="search"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-full border border-ink bg-transparent py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:bg-white"
      />
      {open && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-sand/60 bg-white py-1 shadow-luxury"
        >
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                className="flex w-full px-3 py-2 text-left text-sm text-ink transition hover:bg-champagne"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectName(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
