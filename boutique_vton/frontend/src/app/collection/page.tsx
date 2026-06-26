import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CollectionGrid } from "@/components/CollectionGrid";

export default function CollectionPage() {
  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:px-12 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mt-8">
          <p className="text-sm uppercase tracking-[0.3em] text-sand">
            Your Collection
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
            Your wardrobe
          </h1>
          <p className="mt-4 max-w-2xl text-neutral-700">
            Dresses you have added appear here. Upload new pieces anytime to
            grow your collection.
          </p>
        </header>

        <CollectionGrid />
      </section>
    </main>
  );
}
