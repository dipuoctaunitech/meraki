"use client";

import { useCallback, useEffect, useState } from "react";
import { getCategoryById, type DressCategory } from "@/lib/categories";
import {
  DRESS_CATEGORIES_CHANGED,
  getAllCategories
} from "@/lib/category-storage";

export function useDressCategories() {
  const [categories, setCategories] = useState<DressCategory[]>(
    getAllCategories()
  );

  const refresh = useCallback(() => {
    setCategories(getAllCategories());
  }, []);

  useEffect(() => {
    refresh();

    function handleChange() {
      refresh();
    }

    window.addEventListener(DRESS_CATEGORIES_CHANGED, handleChange);
    return () => {
      window.removeEventListener(DRESS_CATEGORIES_CHANGED, handleChange);
    };
  }, [refresh]);

  const resolveCategory = useCallback(
    (id: string) => getCategoryById(id, categories),
    [categories]
  );

  return { categories, refresh, getCategoryById: resolveCategory };
}
