"use client";

import { useCallback, useEffect, useState } from "react";
import { Dress, refreshUploadedDresses } from "@/lib/dresses";

export function useUploadedDresses() {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    const nextDresses = await refreshUploadedDresses();
    setDresses(nextDresses);
    setHydrated(true);
  }, []);

  useEffect(() => {
    void load();

    function handleChange() {
      void load();
    }

    window.addEventListener("uploaded-dresses-changed", handleChange);
    return () => {
      window.removeEventListener("uploaded-dresses-changed", handleChange);
    };
  }, [load]);

  return { dresses, hydrated };
}
