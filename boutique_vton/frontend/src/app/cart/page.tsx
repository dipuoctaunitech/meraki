"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useUploadedDresses } from "@/hooks/useUploadedDresses";
import { Dress, formatPrice, getDressImageUrl } from "@/lib/dresses";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, formatSubtotal } =
    useCart();
  const { dresses } = useUploadedDresses();

  const lineItems = items
    .map((item) => {
      const dress = dresses.find((entry) => entry.id === item.dressId);
      if (!dress) return null;
      return { ...item, dress };
    })
    .filter(Boolean) as Array<{
    dressId: string;
    size: string;
    quantity: number;
    dress: Dress;
  }>;

  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto w-full max-w-4xl px-6 py-14 md:px-12 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="mt-8">
          <h1 className="font-serif text-4xl text-ink md:text-5xl">
            Your cart
          </h1>
          <p className="mt-3 text-neutral-700">
            Review your items before checkout.
          </p>
        </header>

        {lineItems.length === 0 ? (
          <Card className="mt-12 p-10 text-center">
            <p className="text-neutral-600">Your cart is empty.</p>
            <Link href="/collection" className="mt-6 inline-block">
              <Button>Browse collection</Button>
            </Link>
          </Card>
        ) : (
          <div className="mt-10 space-y-6">
            {lineItems.map((item) => (
              <Card
                key={`${item.dressId}-${item.size}`}
                className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center"
              >
                <div className="relative h-36 w-28 shrink-0 overflow-hidden bg-neutral-100">
                  {getDressImageUrl(item.dress) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getDressImageUrl(item.dress)}
                      alt={item.dress.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link
                      href={`/dress?id=${item.dress.id}`}
                      className="font-serif text-xl text-ink hover:text-neutral-700"
                    >
                      {item.dress.name}
                    </Link>
                    <p className="mt-1 text-sm text-neutral-600">
                      Size {item.size}
                      {formatPrice(item.dress)
                        ? ` · ${formatPrice(item.dress)}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center rounded border border-neutral-300">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() =>
                          updateQuantity(
                            item.dressId,
                            item.size,
                            item.quantity - 1
                          )
                        }
                        className="px-3 py-2 text-neutral-600 hover:text-ink"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() =>
                          updateQuantity(
                            item.dressId,
                            item.size,
                            item.quantity + 1
                          )
                        }
                        className="px-3 py-2 text-neutral-600 hover:text-ink"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label="Remove item"
                      onClick={() => removeItem(item.dressId, item.size)}
                      className="text-neutral-500 transition hover:text-ink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-6">
              <div className="flex items-center justify-between text-lg">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium text-ink">
                  {formatSubtotal(dresses)}
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="flex-1 sm:flex-none">Checkout</Button>
                <Button
                  className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white"
                  onClick={clearCart}
                >
                  Clear cart
                </Button>
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                Checkout is not connected yet — this is a storefront preview.
              </p>
            </Card>
          </div>
        )}
      </section>
    </main>
  );
}
