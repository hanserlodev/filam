"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Categorias from "@/components/landing/Categorias";
import ProductShowcase from "@/components/landing/ProductShowcase";
import WhyUs from "@/components/landing/WhyUs";
import TestimoniosYContacto from "@/components/landing/TestimoniosYContacto";
import Footer from "@/components/landing/Footer";
import type { Catalogo } from "@/lib/catalogo-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LandingPage() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [catActiva, setCatActiva] = useState("todas");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/catalogo`)
      .then((res) => res.json())
      .then(setCatalogo)
      .catch(() => setError("No se pudo cargar el catálogo"));
  }, []);

  const negocio = catalogo?.negocio;

  return (
    <div className="min-h-screen bg-white">
      <Navbar telefono={negocio?.telefono} />

      <Hero
        negocioNombre={negocio?.nombre || "FILAM Ferretería Industrial"}
        totalProductos={catalogo?.total_productos ?? 0}
        totalCategorias={catalogo?.categorias.length ?? 0}
      />

      <TrustBar />

      {error && (
        <div className="container-site mt-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
            {error} — verifica que el backend esté disponible.
          </div>
        </div>
      )}

      <Categorias
        categorias={catalogo?.categorias ?? []}
        productos={catalogo?.productos ?? []}
        catActiva={catActiva}
        onSelect={setCatActiva}
      />

      <ProductShowcase
        productos={catalogo?.productos ?? []}
        catActiva={catActiva}
      />

      <WhyUs />

      <TestimoniosYContacto
        direccion={negocio?.direccion}
        telefono={negocio?.telefono}
      />

      <Footer
        direccion={negocio?.direccion}
        telefono={negocio?.telefono}
        metodosPago={negocio?.metodos_pago}
        ruc={negocio?.ruc}
      />
    </div>
  );
}
