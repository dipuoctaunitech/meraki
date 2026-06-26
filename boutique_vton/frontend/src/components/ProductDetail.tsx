"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatCategoryLabel, getCategoryById } from "@/lib/categories";
import { Dress, formatPrice } from "@/lib/dresses";

type ProductDetailProps = {
  dress: Dress;
};

export function ProductDetail({ dress }: ProductDetailProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const categoryLabel =
    getCategoryById(dress.category)?.label ?? formatCategoryLabel(dress.category);
  const price = formatPrice(dress);
  const cartSize = dress.size.trim() || "One size";
  const activeImage = dress.imageUrls?.[activeImageIndex] ?? "";

  function handleAddToCart() {
    addItem(dress.id, cartSize);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <main className="min-h-screen bg-champagne">
      <section className="mx-auto w-full max-w-6xl px-6 py-14 md:px-12 md:py-16">
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to collection
        </Link>

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div>
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage}
                  alt={dress.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-400">
                  No image
                </div>
              )}
            </div>
            {(dress.imageUrls?.length ?? 0) > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {dress.imageUrls?.map((imageUrl, index) => (
                  <button
                    key={imageUrl}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl border ${
                      activeImageIndex === index
                        ? "border-ink"
                        : "border-neutral-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`${dress.name} view ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-xs uppercase tracking-[0.28em] text-sand">
              {categoryLabel}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-bold italic text-ink md:text-5xl">
              {dress.name}
            </h1>
            {price && (
              <p className="mt-4 text-2xl font-medium text-ink">{price}</p>
            )}
            {dress.description && (
              <p className="mt-6 text-base leading-relaxed text-neutral-700">
                {dress.description}
              </p>
            )}

            {(dress.size || dress.dimensions) && (
              <div className="mt-8 space-y-2 text-sm text-neutral-700">
                {dress.size && (
                  <p>
                    <span className="font-medium text-ink">Size:</span>{" "}
                    {dress.size}
                  </p>
                )}
                {dress.dimensions && (
                  <p>
                    <span className="font-medium text-ink">Dimensions:</span>{" "}
                    {dress.dimensions}
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="gap-2" onClick={handleAddToCart}>
                <ShoppingBag className="h-4 w-4" />
                {added ? "Added to cart" : "Add to cart"}
              </Button>
              <Link href={`/upload/${dress.category}?edit=${dress.id}`}>
                <Button className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white">
                  Edit upload
                </Button>
              </Link>
              <Link href="/cart">
                <Button className="border border-ink bg-transparent text-ink hover:bg-ink hover:text-white">
                  Go to cart
                </Button>
              </Link>
            </div>

            {(dress.videoUrls?.length ?? 0) > 0 && (
              <div className="mt-10 border-t border-neutral-200 pt-8">
                <h2 className="font-serif text-xl text-ink">Videos</h2>
                <div className="mt-4 space-y-4">
                  {dress.videoUrls?.map((videoUrl) => (
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      controls
                      className="w-full rounded-2xl bg-neutral-900"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
