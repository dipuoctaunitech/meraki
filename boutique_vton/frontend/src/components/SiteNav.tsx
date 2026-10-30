"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { CartBadge } from "@/components/CartBadge";

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-40 border-b border-sand/40 bg-champagne/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:px-12 md:py-5">
        <Link
          href="/"
          className="font-serif text-base text-ink sm:text-lg"
        >
          <span className="sm:hidden">Meraki</span>
          <span className="hidden sm:inline">Meraki - The boutique</span>
        </Link>
        <div className="-mx-4 flex items-center gap-4 overflow-x-auto px-4 text-sm scrollbar-none sm:mx-0 sm:gap-6 sm:overflow-visible sm:px-0">
          <Link
            href="/collection"
            className="shrink-0 text-neutral-600 transition hover:text-ink"
          >
            Collection
          </Link>
          <Link
            href="/upload"
            className="shrink-0 text-neutral-600 transition hover:text-ink"
          >
            Upload
          </Link>
          <Link
            href="/accounts"
            className="shrink-0 text-neutral-600 transition hover:text-ink"
          >
            Accounts
          </Link>
          <Link
            href="/cart"
            className="inline-flex shrink-0 items-center gap-1.5 text-neutral-600 transition hover:text-ink"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
            <CartBadge />
          </Link>
        </div>
      </div>
    </nav>
  );
}
