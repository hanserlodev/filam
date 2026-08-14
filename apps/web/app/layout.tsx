import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FILAM — Fábrica de Tuberías PVC y Ferretería",
    template: "%s | FILAM",
  },
  description:
    "FILAM fabrica tuberías y accesorios PVC de alta calidad en Huancayo y opera una ferretería completa. Precios de fábrica, producción bajo norma técnica y despacho para todo el Perú.",
  keywords: [
    "tuberías PVC",
    "FILAM",
    "fábrica PVC",
    "tubos desagüe",
    "tubos presión",
    "accesorios PVC",
    "ferretería",
    "Huancayo",
    "Hualhuas",
  ],
  openGraph: {
    title: "FILAM — Fábrica de Tuberías PVC y Ferretería",
    description:
      "Tuberías y accesorios PVC de alta calidad fabricados en Huancayo, con ferretería completa. Precios de fábrica.",
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
      <body className="min-h-screen bg-white antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
