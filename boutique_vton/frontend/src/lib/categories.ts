export type DressCategory = {
  id: string;
  label: string;
  custom?: boolean;
};

export const DEFAULT_DRESS_CATEGORIES: DressCategory[] = [
  { id: "men", label: "Men" },
  { id: "women", label: "Women" },
  { id: "girl", label: "Girl" },
  { id: "boy", label: "Boy" },
  { id: "baby-boy", label: "Baby Boy" },
  { id: "baby-girl", label: "Baby Girl" }
];

/** @deprecated Use DEFAULT_DRESS_CATEGORIES or useDressCategories() */
export const DRESS_CATEGORIES = DEFAULT_DRESS_CATEGORIES;

export type DressCategoryId = string;

const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyCategoryLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidCategorySlug(id: string): boolean {
  return CATEGORY_SLUG_PATTERN.test(id);
}

export function isDressCategoryId(id: string): id is DressCategoryId {
  return isValidCategorySlug(id);
}

export function getCategoryById(
  id: string,
  categories: DressCategory[] = DEFAULT_DRESS_CATEGORIES
): DressCategory | undefined {
  return categories.find((category) => category.id === id);
}

export function formatCategoryLabel(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
