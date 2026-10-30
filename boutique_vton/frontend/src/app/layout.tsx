import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/CartProvider";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meraki - The boutique",
  description: "Curated dresses and timeless style."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="overflow-x-hidden">
        <CartProvider>
          <SiteNav />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
