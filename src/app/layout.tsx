import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glyph — sketch to physics",
  description: "Turn static sketches and photos into interactive 2D physics simulations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">{children}</body>
    </html>
  );
}
