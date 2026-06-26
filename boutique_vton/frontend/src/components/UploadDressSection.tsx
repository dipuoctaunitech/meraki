"use client";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { categoryExists } from "@/lib/category-storage";
import { useDressCategories } from "@/hooks/useDressCategories";
import { UploadedDressesList } from "@/components/UploadedDressesList";
import { UploadDressForm } from "@/components/UploadDressForm";

type UploadDressSectionProps = {
  category: string;
};

function UploadDressSectionContent({ category }: UploadDressSectionProps) {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { categories } = useDressCategories();

  if (categories.length > 0 && !categoryExists(category)) {
    notFound();
  }

  return (
    <>
      <UploadedDressesList category={category} />
      <UploadDressForm category={category} editId={editId} />
    </>
  );
}

export function UploadDressSection({ category }: UploadDressSectionProps) {
  return (
    <Suspense
      fallback={
        <div className="mt-12 h-40 animate-pulse rounded-3xl bg-neutral-200" />
      }
    >
      <UploadDressSectionContent category={category} />
    </Suspense>
  );
}
