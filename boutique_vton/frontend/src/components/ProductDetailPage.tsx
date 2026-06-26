"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductDetail } from "@/components/ProductDetail";
import { Dress, fetchDressById } from "@/lib/dresses";

type ProductDetailPageProps = {
  id: string;
};

export function ProductDetailPage({ id }: ProductDetailPageProps) {
  const [dress, setDress] = useState<Dress | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDress() {
      const nextDress = await fetchDressById(id);
      if (!active) return;
      setDress(nextDress ?? null);
      setHydrated(true);
    }

    void loadDress();

    function handleChange() {
      void loadDress();
    }

    window.addEventListener("uploaded-dresses-changed", handleChange);
    return () => {
      active = false;
      window.removeEventListener("uploaded-dresses-changed", handleChange);
    };
  }, [id]);

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-champagne">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 md:px-12">
          <div className="mt-10 aspect-[3/4] max-w-lg animate-pulse rounded-2xl bg-neutral-200" />
        </div>
      </main>
    );
  }

  if (!dress) notFound();

  return <ProductDetail dress={dress} />;
}
