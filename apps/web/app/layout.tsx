import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FILAM — Ferretería Industrial",
    template: "%s | FILAM",
  },
  description:
    "Ferretería industrial FILAM: herramientas, materiales de construcción, fijaciones, pintura e insumos eléctricos. Todo para construir y reparar.",
  keywords: [
    "ferretería",
    "FILAM",
    "herramientas",
    "materiales de construcción",
    "pintura",
    "ferretería industrial",
  ],
  openGraph: {
    title: "FILAM — Ferretería Industrial",
    description:
      "Todo lo que necesitas para construir y reparar: herramientas, materiales, fijaciones y más.",
    type: "website",
    locale: "es_PE",
  },
};

export const viewport: Viewport = {
  themeColor: "#1e40af",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen bg-white antialiased">{children}</body>
    </html>
  );
}
