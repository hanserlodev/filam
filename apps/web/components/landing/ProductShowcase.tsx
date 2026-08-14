"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Package,
  AlertTriangle,
  ShoppingCart,
  Check,
} from "lucide-react";
import type { CatalogoProducto } from "@/lib/catalogo-types";
import { formatCurrency } from "@/lib/utils";

interface ProductShowcaseProps {
  productos: CatalogoProducto[];
  catActiva: string;
}

export default function ProductShowcase({
  productos,
  catActiva,
}: ProductShowcaseProps) {
  const [query, setQuery] = useState("");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return productos
      .filter((p) => (catActiva === "todas" ? true : p.categoria_id === catActiva))
      .filter((p) =>
        q
          ? p.nombre.toLowerCase().includes(q) ||
            (typeof p.atributos?.marca === "string" &&
              p.atributos.marca.toLowerCase().includes(q))
          : true
      );
  }, [productos, catActiva, query]);

  return (
    <section id="productos" className="bg-white py-16 lg:py-24">
      <div className="container-site">
        <div className="max-w-2xl mb-10">
          <p className="section-title">Catálogo</p>
          <h2 className="section-heading">Nuestros productos</h2>
          <p className="mt-4 text-steel-500 leading-relaxed">
            Tuberías y accesorios PVC fabricados por FILAM, además de
            herramientas y materiales de la ferretería. Stock actualizado en
            tiempo real.
          </p>
        </div>

        {/* Buscador */}
        <div className="relative max-w-xl mb-10">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-steel-400"
            size={20}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, marca o código..."
            className="w-full pl-12 pr-4 py-4 border-2 border-steel-100 rounded-2xl text-steel-800 placeholder:text-steel-400 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all text-base"
          />
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-steel-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Package size={32} className="text-steel-400" />
            </div>
            <p className="text-lg font-semibold text-steel-700">
              No encontramos productos
            </p>
            <p className="text-steel-400 text-sm mt-1">
              Intenta con otra búsqueda o categoría
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtrados.map((p, i) => {
              const atributos = (p.atributos || {}) as Record<string, unknown>;
              const marca = typeof atributos.marca === "string" ? atributos.marca : null;
              const presentacion =
                typeof atributos.presentacion === "string"
                  ? atributos.presentacion
                  : null;
              const agotado = !p.disponible;

              return (
                <div
                  key={p.id}
                  className="group relative bg-white border border-steel-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-primary-100 transition-all duration-300 hover:-translate-y-1 animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
                >
                  {/* Badge estado */}
                  {agotado ? (
                    <span className="absolute top-3 left-3 z-10 inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <AlertTriangle size={12} />
                      Agotado
                    </span>
                  ) : null}

                  {/* Imagen placeholder con marca */}
                  <div className="h-44 bg-gradient-to-br from-steel-50 to-primary-50/50 flex items-center justify-center relative overflow-hidden">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Package size={40} className="text-primary-500" />
                    </div>
                    {marca && (
                      <span className="absolute bottom-3 left-3 text-[11px] font-bold uppercase tracking-wide text-steel-400 bg-white/80 backdrop-blur px-2 py-1 rounded-md">
                        {marca}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-steel-900 leading-snug line-clamp-2 min-h-[42px]">
                      {p.nombre}
                    </h3>
                    {presentacion && (
                      <p className="text-xs text-steel-400 mt-1">{presentacion}</p>
                    )}

                    <div className="flex items-end justify-between mt-4">
                      <div>
                        <p className="text-[11px] text-steel-400 font-medium uppercase tracking-wide">
                          Precio
                        </p>
                        <p className="text-2xl font-bold text-steel-900 tracking-tight">
                          {formatCurrency(p.precio)}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Check size={12} />
                        En stock
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA inferior */}
        <div className="mt-14 bg-gradient-to-br from-primary-700 to-primary-900 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-light bg-[size:32px_32px] opacity-30" />
          <div className="relative px-8 py-12 text-center lg:text-left lg:flex lg:items-center lg:justify-between gap-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                ¿No encuentras un producto?
              </h3>
              <p className="text-primary-100/80 max-w-xl">
                Tenemos acceso a un catálogo extendido de proveedores. Cuéntanos
                qué necesitas y lo conseguimos al mejor precio.
              </p>
            </div>
            <a
              href="#contacto"
              className="mt-6 lg:mt-0 shrink-0 btn-secondary !px-8 !py-4 text-base inline-flex items-center gap-2"
            >
              <ShoppingCart size={20} />
              Consultar producto
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
