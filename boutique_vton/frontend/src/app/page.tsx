import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 md:px-12">
        <p className="mb-5 text-sm uppercase tracking-[0.3em] text-sand">
          Meraki Collection
        </p>
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-ink md:text-6xl">
          Timeless Dresses for Every Occasion
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-neutral-700 md:text-lg">
          Upload and browse your own dress collection. Add pieces with photos,
          pricing, and details — then view them anytime in your collection.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/collection">
            <Button className="gap-2">View collection</Button>
          </Link>
          <Link href="/upload">
            <Button className="gap-2 border border-ink bg-transparent text-ink hover:bg-ink hover:text-white">
              Upload dress
            </Button>
          </Link>
          <Link href="/cart">
            <Button className="gap-2 border border-ink bg-transparent text-ink hover:bg-ink hover:text-white">
              View cart
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
