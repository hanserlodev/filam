import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FILAM — Ferretería Industrial",
  description: "Sistema de punto de venta para ferretería FILAM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}