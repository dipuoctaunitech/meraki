"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Dress, formatPrice, getDressImageUrl, getDressPriceAmount } from "@/lib/dresses";

export type CartItem = {
  dressId: string;
  size: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  addItem: (dressId: string, size: string, quantity?: number) => void;
  removeItem: (dressId: string, size: string) => void;
  updateQuantity: (dressId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: (dresses: Dress[]) => number;
  formatSubtotal: (dresses: Dress[]) => string;
};

const STORAGE_KEY = "boutique-cart";

const CartContext = createContext<CartContextValue | null>(null);

function readStoredItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback(
    (dressId: string, size: string, quantity = 1) => {
      setItems((current) => {
        const existing = current.find(
          (item) => item.dressId === dressId && item.size === size
        );
        if (existing) {
          return current.map((item) =>
            item.dressId === dressId && item.size === size
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }
        return [...current, { dressId, size, quantity }];
      });
    },
    []
  );

  const removeItem = useCallback((dressId: string, size: string) => {
    setItems((current) =>
      current.filter(
        (item) => !(item.dressId === dressId && item.size === size)
      )
    );
  }, []);

  const updateQuantity = useCallback(
    (dressId: string, size: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(dressId, size);
        return;
      }
      setItems((current) =>
        current.map((item) =>
          item.dressId === dressId && item.size === size
            ? { ...item, quantity }
            : item
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useCallback(
    (dresses: Dress[]) =>
      items.reduce((total, item) => {
        const dress = dresses.find((d) => d.id === item.dressId);
        return total + (dress ? getDressPriceAmount(dress) : 0) * item.quantity;
      }, 0),
    [items]
  );

  const formatSubtotal = useCallback(
    (dresses: Dress[]) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(subtotal(dresses)),
    [subtotal]
  );

  const itemCount = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      formatSubtotal
    }),
    [
      items,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal,
      formatSubtotal
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
