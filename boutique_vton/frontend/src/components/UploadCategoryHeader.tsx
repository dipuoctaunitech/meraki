"use client";

import { formatCategoryLabel } from "@/lib/categories";
import { useDressCategories } from "@/hooks/useDressCategories";

type UploadCategoryHeaderProps = {
  categoryId: string;
};

export function UploadCategoryHeader({ categoryId }: UploadCategoryHeaderProps) {
  const { getCategoryById } = useDressCategories();
  const category = getCategoryById(categoryId);
  const label = category?.label ?? formatCategoryLabel(categoryId);

  return (
    <header className="mt-8 max-w-2xl">
      <p className="text-xs uppercase tracking-[0.28em] text-sand">{label}</p>
      <h1 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
        Upload dress
      </h1>
      <p className="mt-4 text-base leading-relaxed text-neutral-700">
        Add photos, videos, and product details for your{" "}
        {label.toLowerCase()} dress listing.
      </p>
    </header>
  );
}
