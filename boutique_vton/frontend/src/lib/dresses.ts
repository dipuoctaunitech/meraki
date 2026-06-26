import type { DressCategoryId } from "@/lib/categories";
import {
  getUploadedDressById,
  loadUploadedDresses,
  notifyUploadedDressesChanged,
  saveUploadedDress as persistUploadedDress
} from "@/lib/dress-storage";

export const UPLOADED_DRESSES_KEY = "uploaded-dresses";

export type Dress = {
  id: string;
  category: DressCategoryId;
  name: string;
  showPrice: boolean;
  price: string;
  description: string;
  size: string;
  dimensions: string;
  imageUrls: string[];
  videoUrls: string[];
};

let dressCache: Dress[] = [];

export function getCachedDresses(): Dress[] {
  return dressCache;
}

export function setCachedDresses(dresses: Dress[]) {
  dressCache = dresses;
}

export async function refreshUploadedDresses(): Promise<Dress[]> {
  const dresses = await loadUploadedDresses();
  dressCache = dresses;
  return dresses;
}

export async function saveUploadedDress(dress: Dress): Promise<void> {
  await persistUploadedDress(dress);
  dressCache = await loadUploadedDresses();
  notifyUploadedDressesChanged();
}

export function getDressById(id: string): Dress | undefined {
  return dressCache.find((dress) => dress.id === id);
}

export async function fetchDressById(id: string): Promise<Dress | undefined> {
  const dress = await getUploadedDressById(id);
  if (dress) return dress;
  return getDressById(id);
}

export function getDressImageUrl(dress: Dress): string {
  return dress.imageUrls?.[0] ?? "";
}

export function formatPrice(dress: Dress): string | null {
  if (!dress.showPrice || !dress.price) return null;
  const amount = Number(dress.price);
  if (Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

export function getDressPriceAmount(dress: Dress): number {
  if (!dress.showPrice || !dress.price) return 0;
  const amount = Number(dress.price);
  return Number.isNaN(amount) ? 0 : amount;
}

export function createDressId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dress-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export { compressImageFile, fileToDataUrl } from "@/lib/dress-storage";
