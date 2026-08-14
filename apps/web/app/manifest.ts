import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FILAM — Tuberías PVC y Ferretería",
    short_name: "FILAM POS",
    description: "Punto de venta y catálogo de FILAM",
    start_url: "/pos",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e40af",
    lang: "es-PE",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
