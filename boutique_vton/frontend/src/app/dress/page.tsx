"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProductDetailPage } from "@/components/ProductDetailPage";
import { Spinner } from "@/components/ui/Spinner";

function DressDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-champagne">
        <p className="text-neutral-600">Dress not found.</p>
      </main>
    );
  }

  return <ProductDetailPage id={id} />;
}

export default function DressPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-champagne">
          <Spinner />
        </main>
      }
    >
      <DressDetailContent />
    </Suspense>
  );
}
