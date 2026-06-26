import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CategoryPicker } from "@/components/CategoryPicker";
import { UploadedDressesList } from "@/components/UploadedDressesList";

export default function UploadPage() {
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

        <header className="mt-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-sand">
            Upload
          </p>
          <h1 className="mt-3 font-serif text-4xl text-ink md:text-5xl">
            Add a dress
          </h1>
          <p className="mt-4 text-base leading-relaxed text-neutral-700">
            Select a category to upload photos, videos, and product details for
            your dress listing.
          </p>
        </header>

        <div className="mt-12 space-y-12">
          <UploadedDressesList />
          <CategoryPicker />
        </div>
      </section>
    </main>
  );
}
