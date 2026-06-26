"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useUploadedDresses } from "@/hooks/useUploadedDresses";
import { useDressCategories } from "@/hooks/useDressCategories";
import { formatCategoryLabel } from "@/lib/categories";
import { formatPrice, getDressImageUrl } from "@/lib/dresses";

type UploadedDressesListProps = {
  category?: string;
};

export function UploadedDressesList({ category }: UploadedDressesListProps) {
  const { dresses, hydrated } = useUploadedDresses();
  const { getCategoryById } = useDressCategories();
  const filteredDresses = category
    ? dresses.filter((dress) => dress.category === category)
    : dresses;

  if (!hydrated || filteredDresses.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      <h2 className="font-serif text-2xl text-ink">Your uploads</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Continue editing a saved dress without losing photos, videos, or details.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDresses.map((dress) => {
          const imageUrl = getDressImageUrl(dress);
          const price = formatPrice(dress);
          const categoryLabel =
            getCategoryById(dress.category)?.label ??
            formatCategoryLabel(dress.category);

          return (
            <Card key={dress.id} className="flex gap-4 p-4">
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={dress.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-sand">
                  {categoryLabel}
                </p>
                <p className="mt-1 truncate font-serif text-lg font-bold italic text-ink">
                  {dress.name}
                </p>
                {price && (
                  <p className="mt-1 text-sm font-medium text-ink">{price}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <Link
                    href={`/upload/${dress.category}?edit=${dress.id}`}
                    className="inline-flex items-center gap-1.5 font-medium text-ink transition hover:opacity-70"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <Link
                    href={`/dress?id=${dress.id}`}
                    className="text-neutral-600 transition hover:text-ink"
                  >
                    View
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
