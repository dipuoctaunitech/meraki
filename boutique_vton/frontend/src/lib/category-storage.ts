import {
  DEFAULT_DRESS_CATEGORIES,
  type DressCategory,
  slugifyCategoryLabel
} from "@/lib/categories";

const CUSTOM_CATEGORIES_KEY = "boutique-custom-categories";
export const DRESS_CATEGORIES_CHANGED = "dress-categories-changed";

function isDressCategory(value: unknown): value is DressCategory {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    item.id.length > 0 &&
    item.label.trim().length > 0
  );
}

export function getCustomCategories(): DressCategory[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDressCategory).map((category) => ({
      ...category,
      custom: true
    }));
  } catch {
    return [];
  }
}

export function getAllCategories(): DressCategory[] {
  const customCategories = getCustomCategories();
  const defaultIds = new Set(DEFAULT_DRESS_CATEGORIES.map((category) => category.id));
  const uniqueCustom = customCategories.filter(
    (category) => !defaultIds.has(category.id)
  );
  return [...DEFAULT_DRESS_CATEGORIES, ...uniqueCustom];
}

export function categoryExists(id: string): boolean {
  return getAllCategories().some((category) => category.id === id);
}

export type AddCategoryResult =
  | { ok: true; category: DressCategory }
  | { ok: false; error: string };

export function addCustomCategory(label: string): AddCategoryResult {
  const trimmed = label.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Category name must be at least 2 characters." };
  }

  const id = slugifyCategoryLabel(trimmed);
  if (!id) {
    return {
      ok: false,
      error: "Enter a category name with letters or numbers."
    };
  }

  if (getAllCategories().some((category) => category.id === id)) {
    return { ok: false, error: "That category already exists." };
  }

  const category: DressCategory = {
    id,
    label: trimmed,
    custom: true
  };

  const customCategories = getCustomCategories();
  customCategories.push(category);
  window.localStorage.setItem(
    CUSTOM_CATEGORIES_KEY,
    JSON.stringify(customCategories)
  );
  window.dispatchEvent(new Event(DRESS_CATEGORIES_CHANGED));

  return { ok: true, category };
}

export function notifyDressCategoriesChanged() {
  window.dispatchEvent(new Event(DRESS_CATEGORIES_CHANGED));
}
