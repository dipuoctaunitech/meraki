import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartBadge } from "@/components/CartBadge";

export function SiteNav() {
  return (
    <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-12">
      <Link href="/" className="font-serif text-lg text-ink">
        Meraki - The boutique
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link
          href="/collection"
          className="text-neutral-600 transition hover:text-ink"
        >
          Collection
        </Link>
        <Link
          href="/upload"
          className="text-neutral-600 transition hover:text-ink"
        >
          Upload
        </Link>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-neutral-600 transition hover:text-ink"
        >
          <ShoppingBag className="h-4 w-4" />
          Cart
          <CartBadge />
        </Link>
      </div>
    </nav>
  );
}
