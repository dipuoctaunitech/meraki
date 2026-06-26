"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { addCustomCategory } from "@/lib/category-storage";
import { cn } from "@/lib/utils";
import { useDressCategories } from "@/hooks/useDressCategories";

type CategoryPickerProps = {
  selectedCategory?: string | null;
};

export function CategoryPicker({ selectedCategory = null }: CategoryPickerProps) {
  const router = useRouter();
  const { categories } = useDressCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const result = addCustomCategory(newCategoryName);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setNewCategoryName("");
    setAdding(false);
    router.push(`/upload/${result.category.id}`);
  }

  return (
    <section>
      <h2 className="font-serif text-2xl text-ink">Select category</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Choose who this dress is for, or add your own category.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <Link
              key={category.id}
              href={`/upload/${category.id}`}
              className={cn(
                "rounded-full border px-5 py-2.5 text-sm font-medium transition",
                isSelected
                  ? "border-ink bg-ink text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-ink hover:text-ink"
              )}
            >
              {category.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setAdding((current) => !current);
            setError("");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-dashed border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition hover:border-ink hover:text-ink"
        >
          <Plus className="h-4 w-4" />
          Add category
        </button>
      </div>

      {adding && (
        <form
          onSubmit={handleAddCategory}
          className="mt-6 max-w-md rounded-2xl border border-neutral-200 bg-white p-5"
        >
          <label
            htmlFor="new-category-name"
            className="block text-sm font-medium text-ink"
          >
            New category name
          </label>
          <input
            id="new-category-name"
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="e.g. Teen, Bridal, Plus Size"
            className="mt-3 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-ink"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" className="px-5 py-2 text-xs">
              Save category
            </Button>
            <Button
              type="button"
              className="border border-ink bg-transparent px-5 py-2 text-xs text-ink hover:bg-ink hover:text-white"
              onClick={() => {
                setAdding(false);
                setError("");
                setNewCategoryName("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
