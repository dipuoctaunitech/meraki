const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9"
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Convert spoken phone text into digits only. */
export function transcriptToPhoneDigits(transcript: string): string {
  const cleaned = transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  // Prefer already-spoken digit runs first (e.g. "98765 43210").
  const rawDigits = cleaned.replace(/\D/g, "");
  if (rawDigits.length >= 8) return rawDigits;

  const tokens = cleaned.split(" ");
  const digits: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (/^\d+$/.test(token)) {
      digits.push(...token.split(""));
      i += 1;
      continue;
    }
    if ((token === "double" || token === "triple") && i + 1 < tokens.length) {
      const next = DIGIT_WORDS[tokens[i + 1]];
      if (next) {
        const times = token === "triple" ? 3 : 2;
        digits.push(...Array(times).fill(next));
        i += 2;
        continue;
      }
    }
    const mapped = DIGIT_WORDS[token];
    if (mapped) digits.push(mapped);
    i += 1;
  }

  const fromWords = digits.join("");
  return fromWords.length >= rawDigits.length ? fromWords : rawDigits;
}

const DEVANAGARI_RE = /[\u0900-\u097F]/;

/** Independent vowels. */
const HI_VOWELS: Record<string, string> = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ऋ: "ri",
  ऍ: "e",
  ए: "e",
  ऐ: "ai",
  ऑ: "o",
  ओ: "o",
  औ: "au",
  अं: "an",
  अः: "ah"
};

/** Matras (vowel signs). */
const HI_MATRAS: Record<string, string> = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "ृ": "ri",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ॉ": "o",
  "ॅ": "e"
};

/** Consonants (inherent 'a' added when needed). */
const HI_CONSONANTS: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ng",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "ny",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  क्ष: "ksh",
  त्र: "tr",
  ज्ञ: "gy",
  ळ: "l",
  क़: "q",
  ख़: "kh",
  ग़: "g",
  ज़: "z",
  ड़: "d",
  ढ़: "dh",
  फ़: "f"
};

function isDevanagariChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0900 && code <= 0x097f;
}

/**
 * Transliterate Hindi Devanagari to common English spelling
 * (e.g. प्रिया → Priya-style latin letters).
 */
export function transliterateDevanagariToEnglish(text: string): string {
  let out = "";
  let i = 0;
  const chars = Array.from(text);

  while (i < chars.length) {
    const ch = chars[i];
    const next = chars[i + 1] ?? "";
    const pair = ch + next;

    // Spaces / punctuation pass through.
    if (!isDevanagariChar(ch)) {
      out += ch;
      i += 1;
      continue;
    }

    // Composite consonants first.
    if (HI_CONSONANTS[pair]) {
      const base = HI_CONSONANTS[pair];
      const after = chars[i + 2] ?? "";
      if (HI_MATRAS[after]) {
        out += base + HI_MATRAS[after];
        i += 3;
      } else if (after === "्") {
        out += base;
        i += 3;
      } else if (after === "ं") {
        out += `${base}an`;
        i += 3;
      } else if (after === "ः") {
        out += `${base}ah`;
        i += 3;
      } else if (isDevanagariChar(after) && !HI_MATRAS[after] && after !== "्") {
        // Inherent a before next consonant/vowel letter.
        out += `${base}a`;
        i += 2;
      } else {
        out += `${base}a`;
        i += 2;
      }
      continue;
    }

    if (HI_VOWELS[ch]) {
      out += HI_VOWELS[ch];
      i += 1;
      continue;
    }

    if (HI_CONSONANTS[ch]) {
      const base = HI_CONSONANTS[ch];
      if (HI_MATRAS[next]) {
        out += base + HI_MATRAS[next];
        i += 2;
      } else if (next === "्") {
        // Halant: no inherent a; skip virama.
        out += base;
        i += 2;
      } else if (next === "ं") {
        out += `${base}an`;
        i += 2;
      } else if (next === "ः") {
        out += `${base}ah`;
        i += 2;
      } else if (
        next &&
        isDevanagariChar(next) &&
        !HI_MATRAS[next] &&
        next !== "्"
      ) {
        out += `${base}a`;
        i += 1;
      } else {
        // End of word / non-Devanagari next → keep inherent a for names.
        out += next === "" || !isDevanagariChar(next) ? `${base}a` : `${base}a`;
        i += 1;
      }
      continue;
    }

    // Chandrabindu / anusvara / visarga alone.
    if (ch === "ं") {
      out += "n";
      i += 1;
      continue;
    }
    if (ch === "ँ") {
      out += "n";
      i += 1;
      continue;
    }
    if (ch === "ः") {
      out += "h";
      i += 1;
      continue;
    }
    if (ch === "्") {
      i += 1;
      continue;
    }

    i += 1;
  }

  return out
    .replace(/aa+/g, "aa")
    .replace(/([aeiou])\1{2,}/gi, "$1$1")
    // Prefer everyday English name spellings: Priyaa→Priya, Radhaa→Radha
    .replace(/aa/gi, "a")
    .trim();
}

function titleCaseName(value: string): string {
  return value
    .split(" ")
    .map((part) => {
      if (!part) return part;
      if (part.includes("-")) {
        return part
          .split("-")
          .map((chunk) =>
            chunk
              ? chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase()
              : chunk
          )
          .join("-");
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Clean spoken person name; Hindi script → English spelling. */
export function transcriptToPersonName(transcript: string): string {
  let cleaned = transcript
    .replace(/[^\p{L}\p{M}\s'.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  if (DEVANAGARI_RE.test(cleaned)) {
    cleaned = transliterateDevanagariToEnglish(cleaned)
      .replace(/[^a-zA-Z\s'.-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!cleaned) return "";
  return titleCaseName(cleaned);
}

/** Clean spoken item / product name; Hindi script → English spelling. */
export function transcriptToItemName(transcript: string): string {
  return transcriptToPersonName(transcript);
}

const CURRENCY_NOISE =
  /\b(rupees?|ruppee|rs\.?|inr|only|rupee)\b|₹/gi;

/**
 * Parse a spoken amount into a numeric string (price / line total).
 * Accepts digits, "point/dot", and digit words ("two five zero zero").
 */
export function transcriptToAmount(transcript: string): string {
  let cleaned = transcript
    .toLowerCase()
    .replace(CURRENCY_NOISE, " ")
    .replace(/,/g, "")
    .replace(/\b(point|dot)\b/g, " . ")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  // Prefer an explicit numeric token when present (e.g. "2500.50").
  const numericMatch = cleaned.match(/\d+(?:\.\d+)?/);
  if (numericMatch && (numericMatch[0].includes(".") || /\d{2,}/.test(numericMatch[0]))) {
    const value = Number(numericMatch[0]);
    if (Number.isFinite(value) && value >= 0) {
      return String(Math.round(value * 100) / 100);
    }
  }

  const tokens = cleaned.split(" ");
  const parts: string[] = [];
  let i = 0;
  let seenDot = false;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === ".") {
      if (!seenDot && parts.length > 0) {
        parts.push(".");
        seenDot = true;
      }
      i += 1;
      continue;
    }
    if (/^\d+$/.test(token)) {
      parts.push(...token.split(""));
      i += 1;
      continue;
    }
    if ((token === "double" || token === "triple") && i + 1 < tokens.length) {
      const next = DIGIT_WORDS[tokens[i + 1]];
      if (next) {
        const times = token === "triple" ? 3 : 2;
        parts.push(...Array(times).fill(next));
        i += 2;
        continue;
      }
    }
    const mapped = DIGIT_WORDS[token];
    if (mapped) parts.push(mapped);
    i += 1;
  }

  if (!parts.length) {
    if (numericMatch) {
      const value = Number(numericMatch[0]);
      if (Number.isFinite(value) && value >= 0) {
        return String(Math.round(value * 100) / 100);
      }
    }
    return "";
  }

  const joined = parts.join("");
  // Guard against multiple dots from noisy speech.
  const firstDot = joined.indexOf(".");
  const normalized =
    firstDot === -1
      ? joined
      : `${joined.slice(0, firstDot)}.${joined.slice(firstDot + 1).replace(/\./g, "")}`;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return "";
  return String(Math.round(value * 100) / 100);
}

/** Parse spoken quantity as a positive integer string. */
export function transcriptToQuantity(transcript: string): string {
  const amount = transcriptToAmount(transcript);
  if (!amount) return "";
  const qty = Math.max(1, Math.round(Number(amount)));
  if (!Number.isFinite(qty) || qty < 1) return "";
  return String(qty);
}
