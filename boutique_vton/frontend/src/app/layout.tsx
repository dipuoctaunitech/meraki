import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meraki - The boutique",
  description: "Curated dresses and timeless style."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <SiteNav />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
