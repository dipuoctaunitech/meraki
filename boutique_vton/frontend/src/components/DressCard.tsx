import Link from "next/link";
import { formatCategoryLabel, getCategoryById } from "@/lib/categories";
import { Dress, formatPrice, getDressImageUrl } from "@/lib/dresses";

type DressCardProps = {
  dress: Dress;
};

export function DressCard({ dress }: DressCardProps) {
  const categoryLabel =
    getCategoryById(dress.category)?.label ?? formatCategoryLabel(dress.category);
  const imageUrl = getDressImageUrl(dress);
  const price = formatPrice(dress);

  return (
    <Link
      href={`/dress?id=${dress.id}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-luxury transition hover:border-neutral-300"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={dress.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            No image
          </div>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-sand">
          {categoryLabel}
        </p>
        <h2 className="mt-2 font-serif text-xl font-bold italic text-ink">
          {dress.name}
        </h2>
        {dress.size && (
          <p className="mt-2 text-sm text-neutral-600">Size {dress.size}</p>
        )}
        {price && <p className="mt-3 font-medium text-ink">{price}</p>}
      </div>
    </Link>
  );
}
