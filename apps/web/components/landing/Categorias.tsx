"use client";

import { ArrowRight, Layers } from "lucide-react";
import type { Categoria, CatalogoProducto } from "@/lib/catalogo-types";
import { CATEGORIA_ICONS } from "@/lib/catalogo-types";

interface CategoriasProps {
  categorias: Categoria[];
  productos: CatalogoProducto[];
  catActiva: string;
  onSelect: (id: string) => void;
}

export default function Categorias({
  categorias,
  productos,
  catActiva,
  onSelect,
}: CategoriasProps) {
  const contador = (id: string) =>
    productos.filter((p) => p.categoria_id === id).length;

  const categoriasConData = categorias.map((c) => ({
    ...c,
    icono: CATEGORIA_ICONS[c.nombre] || "🛠️",
    cantidad: contador(c.id),
  }));

  return (
    <section id="categorias" className="bg-steel-50/60 py-16 lg:py-24">
      <div className="container-site">
        <div className="max-w-2xl mb-12">
          <p className="section-title">Categorías</p>
          <h2 className="section-heading">
            Explora por categoría y encuentra lo que buscas
          </h2>
          <p className="mt-4 text-steel-500 leading-relaxed">
            Desde herramientas de mano hasta materiales de construcción,
            tenemos organizado todo nuestro catálogo para que encuentres
            rápido lo que necesitas.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onSelect("todas")}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 ${
              catActiva === "todas"
                ? "bg-primary-600 text-white shadow-xl shadow-primary-600/25"
                : "bg-white text-steel-800 hover:shadow-lg border border-steel-100"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                catActiva === "todas"
                  ? "bg-white/15"
                  : "bg-primary-50 group-hover:bg-primary-100"
              }`}
            >
              <Layers size={20} className={catActiva === "todas" ? "text-white" : "text-primary-600"} />
            </div>
            <p className="font-semibold text-sm">Todos</p>
            <p
              className={`text-xs mt-1 ${
                catActiva === "todas" ? "text-white/70" : "text-steel-400"
              }`}
            >
              {productos.length} productos
            </p>
          </button>

          {categoriasConData.map((c) => {
            const activa = catActiva === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 ${
                  activa
                    ? "bg-primary-600 text-white shadow-xl shadow-primary-600/25"
                    : "bg-white text-steel-800 hover:shadow-lg border border-steel-100"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-lg ${
                    activa
                      ? "bg-white/15"
                      : "bg-steel-50 group-hover:bg-steel-100"
                  }`}
                >
                  {c.icono}
                </div>
                <p className="font-semibold text-sm leading-tight">{c.nombre}</p>
                <p
                  className={`text-xs mt-1 ${
                    activa ? "text-white/70" : "text-steel-400"
                  }`}
                >
                  {c.cantidad} productos
                </p>
                {activa && (
                  <div className="absolute top-4 right-4">
                    <ArrowRight size={16} className="text-white/80" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
