"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DressCard } from "@/components/DressCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useDressCategories } from "@/hooks/useDressCategories";
import { useUploadedDresses } from "@/hooks/useUploadedDresses";
import { formatCategoryLabel } from "@/lib/categories";
import type { Dress } from "@/lib/dresses";

function groupDressesByCategory(
  dresses: Dress[],
  categories: { id: string; label: string }[]
) {
  const byCategory = new Map<string, Dress[]>();

  for (const dress of dresses) {
    const list = byCategory.get(dress.category) ?? [];
    list.push(dress);
    byCategory.set(dress.category, list);
  }

  const grouped: { id: string; label: string; dresses: Dress[] }[] = [];
  const seen = new Set<string>();

  for (const category of categories) {
    const categoryDresses = byCategory.get(category.id);
    if (!categoryDresses?.length) continue;

    grouped.push({
      id: category.id,
      label: category.label,
      dresses: categoryDresses
    });
    seen.add(category.id);
  }

  for (const [id, categoryDresses] of byCategory) {
    if (seen.has(id) || categoryDresses.length === 0) continue;

    grouped.push({
      id,
      label: formatCategoryLabel(id),
      dresses: categoryDresses
    });
  }

  return grouped;
}

export function CollectionGrid() {
  const { dresses, hydrated } = useUploadedDresses();
  const { categories } = useDressCategories();
  const groupedDresses = useMemo(
    () => groupDressesByCategory(dresses, categories),
    [dresses, categories]
  );

  if (!hydrated) {
    return (
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  if (dresses.length === 0) {
    return (
      <Card className="mt-12 p-10 text-center">
        <p className="text-neutral-600">No dresses uploaded yet.</p>
        <p className="mt-2 text-sm text-neutral-500">
          Upload your first dress to start building the collection.
        </p>
        <Link href="/upload" className="mt-6 inline-block">
          <Button>Upload dress</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mt-12 space-y-14">
      {groupedDresses.map((group) => (
        <section key={group.id}>
          <h2 className="font-serif text-2xl text-ink">{group.label}</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {group.dresses.map((dress, index) => (
              <DressCard
                key={dress.id || `dress-${group.id}-${index}`}
                dress={dress}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
