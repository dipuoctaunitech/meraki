import type { Dress } from "@/lib/dresses";

const DB_NAME = "boutique-uploaded-dresses";
const DB_VERSION = 1;
const STORE_NAME = "dresses";
const LEGACY_STORAGE_KEY = "uploaded-dresses";

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeDress(raw: unknown, index: number): Dress | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return null;

  const category =
    typeof item.category === "string" && item.category.trim()
      ? item.category.trim()
      : "women";

  const imageUrls = toStringArray(item.imageUrls);
  const legacyImages = toStringArray(item.images).filter((url) =>
    url.startsWith("data:")
  );
  const videoUrls = toStringArray(item.videoUrls);
  const legacyVideos = toStringArray(item.videos).filter((url) =>
    url.startsWith("data:")
  );

  const id =
    typeof item.id === "string" && item.id.trim()
      ? item.id
      : `legacy-${index}-${name.toLowerCase().replace(/\s+/g, "-")}`;

  return {
    id,
    category,
    name,
    showPrice: item.showPrice !== false,
    price:
      typeof item.price === "string"
        ? item.price
        : item.price == null
          ? ""
          : String(item.price),
    description: typeof item.description === "string" ? item.description : "",
    size: typeof item.size === "string" ? item.size : "",
    dimensions: typeof item.dimensions === "string" ? item.dimensions : "",
    imageUrls: imageUrls.length > 0 ? imageUrls : legacyImages,
    videoUrls: videoUrls.length > 0 ? videoUrls : legacyVideos
  };
}

function normalizeStoredDresses(raw: unknown): Dress[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => normalizeDress(item, index))
    .filter((dress): dress is Dress => dress !== null);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function readLegacyDresses(): Promise<Dress[]> {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    return normalizeStoredDresses(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

async function readDressesFromDb(db: IDBDatabase): Promise<Dress[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      resolve(normalizeStoredDresses(request.result));
    };
    request.onerror = () => {
      reject(request.error ?? new Error("Failed to read dresses"));
    };
  });
}

async function writeDressesToDb(db: IDBDatabase, dresses: Dress[]): Promise<void> {
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.clear();

  for (const dress of dresses) {
    store.put(dress);
  }

  await waitForTransaction(transaction);
}

async function migrateLegacyDresses(db: IDBDatabase): Promise<Dress[]> {
  const legacyDresses = await readLegacyDresses();
  if (legacyDresses.length === 0) return [];

  await writeDressesToDb(db, legacyDresses);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return legacyDresses;
}

export async function loadUploadedDresses(): Promise<Dress[]> {
  if (typeof window === "undefined") return [];

  const db = await openDatabase();
  let dresses = await readDressesFromDb(db);

  if (dresses.length === 0) {
    dresses = await migrateLegacyDresses(db);
  }

  return dresses;
}

export async function saveUploadedDress(dress: Dress): Promise<void> {
  const db = await openDatabase();
  const dresses = await readDressesFromDb(db);
  const existingIndex = dresses.findIndex((item) => item.id === dress.id);

  if (existingIndex >= 0) {
    dresses[existingIndex] = dress;
  } else {
    dresses.push(dress);
  }

  await writeDressesToDb(db, dresses);
}

export async function getUploadedDressById(id: string): Promise<Dress | undefined> {
  const dresses = await loadUploadedDresses();
  return dresses.find((dress) => dress.id === id);
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);

  if (!file.type.startsWith("image/")) {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
    image.src = dataUrl;
  });
}

export function notifyUploadedDressesChanged() {
  window.dispatchEvent(new Event("uploaded-dresses-changed"));
}
