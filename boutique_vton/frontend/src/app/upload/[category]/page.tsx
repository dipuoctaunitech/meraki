import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { UploadCategoryHeader } from "@/components/UploadCategoryHeader";
import { UploadDressSection } from "@/components/UploadDressSection";
import { isValidCategorySlug } from "@/lib/categories";

type CategoryUploadPageProps = {
  params: Promise<{ category: string }>;
};

export function generateStaticParams() {
  return [
    { category: "men" },
    { category: "women" },
    { category: "girl" },
    { category: "boy" },
    { category: "baby-boy" },
    { category: "baby-girl" }
  ];
}

export default async function CategoryUploadPage({
  params
}: CategoryUploadPageProps) {
  const { category } = await params;
  if (!isValidCategorySlug(category)) notFound();

  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:px-12 md:py-16">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 transition hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Change category
          </Link>
          <span className="text-neutral-300">|</span>
          <Link
            href="/"
            className="text-sm text-neutral-600 transition hover:text-ink"
          >
            Back to home
          </Link>
        </div>

        <UploadCategoryHeader categoryId={category} />

        <div className="mt-12">
          <UploadDressSection category={category} />
        </div>
      </section>
    </main>
  );
}
