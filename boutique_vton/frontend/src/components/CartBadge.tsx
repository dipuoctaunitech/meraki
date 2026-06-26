"use client";

import { useCart } from "@/components/CartProvider";

export function CartBadge() {
  const { itemCount } = useCart();
  if (itemCount === 0) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-[10px] font-medium text-white">
      {itemCount}
    </span>
  );
}
