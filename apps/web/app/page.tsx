"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardHat,
  Phone,
  MapPin,
  ShoppingCart,
  Package,
  Wrench,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CatalogoProducto {
  id: string;
  nombre: string;
  sku: string | null;
  codigo_barras: string | null;
  precio: number;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  atributos: Record<string, unknown> | null;
  categoria_id: string;
}

interface Categoria {
  id: string;
  nombre: string;
}

interface Catalogo {
  negocio: {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    metodos_pago: string[];
  };
  categorias: Categoria[];
  productos: CatalogoProducto[];
  total_productos: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LandingPage() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [catActiva, setCatActiva] = useState<string>("todas");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/catalogo`)
      .then((res) => res.json())
      .then(setCatalogo)
      .catch(() => setError("No se pudo cargar el catálogo"));
  }, []);

  const productosFiltrados = catalogo
    ? catActiva === "todas"
      ? catalogo.productos
      : catalogo.productos.filter((p) => p.categoria_id === catActiva)
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-primary-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary-500 rounded-xl flex items-center justify-center">
              <HardHat size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">FILAM</h1>
              <p className="text-xs text-white/70">Ferretería Industrial</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6 text-sm text-white/80">
            <a href="#productos" className="hover:text-white">Productos</a>
            <a href="#categorias" className="hover:text-white">Categorías</a>
            <a href="#contacto" className="hover:text-white">Contacto</a>
          </nav>
          <Link
            href="/login"
            className="flex items-center space-x-2 bg-secondary-500 hover:bg-secondary-600 text-white font-semibold px-4 py-2.5 rounded-lg transition shadow-md"
          >
            <ShoppingCart size={18} />
            <span>Ingresar al POS</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-800 to-primary-950 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Abierto hoy</span>
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
                {catalogo?.negocio.nombre || "FILAM Ferretería Industrial"}
              </h2>
              <p className="text-lg text-primary-100 mb-6">
                Todo lo que necesitas para construir y reparar. Herramientas,
                materiales, fijaciones, pintura y más al mejor precio.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#productos"
                  className="flex items-center space-x-2 bg-secondary-500 hover:bg-secondary-600 font-semibold px-6 py-3.5 rounded-lg transition shadow-lg"
                >
                  <Wrench size={20} />
                  <span>Ver productos</span>
                </a>
                <Link
                  href="/login"
                  className="flex items-center space-x-2 border-2 border-white/30 hover:bg-white/10 font-semibold px-6 py-3 rounded-lg transition"
                >
                  <span>Área de ventas</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Package size={28} className="text-secondary-400 mb-2" />
                <p className="text-3xl font-bold">{catalogo?.total_productos ?? "—"}</p>
                <p className="text-sm text-white/70">Productos en stock</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6">
                <Wrench size={28} className="text-secondary-400 mb-2" />
                <p className="text-3xl font-bold">{catalogo?.categorias.length ?? "—"}</p>
                <p className="text-sm text-white/70">Categorías</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías */}
      <section id="categorias" className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCatActiva("todas")}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition ${
              catActiva === "todas"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Todas
          </button>
          {catalogo?.categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatActiva(c.id)}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition ${
                catActiva === c.id
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </section>

      {/* Vitrina de productos */}
      <section id="productos" className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Nuestros productos</h3>
          <span className="text-sm text-gray-500">
            {productosFiltrados.length} productos
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productosFiltrados.map((p) => {
            const atributos = (p.atributos || {}) as Record<string, unknown>;
            const agotado = p.stock <= 0;
            const bajoStock = !agotado && p.stock <= p.stock_minimo;
            return (
              <div
                key={p.id}
                className="card p-4 flex flex-col"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
                  <Package size={24} className="text-primary-600" />
                </div>
                <p className="font-semibold text-gray-900 leading-snug">{p.nombre}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {typeof atributos.marca === "string" ? `${atributos.marca} · ` : ""}
                  {typeof atributos.presentacion === "string"
                    ? atributos.presentacion
                    : `por ${p.unidad_medida}`}
                </p>
                <div className="flex items-end justify-between mt-4">
                  <p className="text-xl font-bold text-primary-600">
                    {formatCurrency(p.precio)}
                  </p>
                  {agotado ? (
                    <span className="flex items-center space-x-1 text-xs font-semibold text-red-600">
                      <AlertTriangle size={14} />
                      <span>Agotado</span>
                    </span>
                  ) : bajoStock ? (
                    <span className="text-xs font-semibold text-amber-600">
                      Poco stock ({p.stock})
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {p.stock} {p.unidad_medida}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {productosFiltrados.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay productos en esta categoría
          </div>
        )}
      </section>

      {/* Contacto */}
      <footer id="contacto" className="bg-steel-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-secondary-500 rounded-xl flex items-center justify-center">
                  <HardHat size={22} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold">FILAM</h4>
                  <p className="text-sm text-white/60">Ferretería Industrial</p>
                </div>
              </div>
              <p className="text-sm text-white/60">
                {catalogo?.negocio.ruc
                  ? `RUC: ${catalogo.negocio.ruc}`
                  : "Venta de insumos y herramientas de ferretería"}
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contacto</h4>
              <div className="space-y-3 text-sm text-white/70">
                {catalogo?.negocio.direccion && (
                  <p className="flex items-start space-x-2">
                    <MapPin size={18} className="text-secondary-400 mt-0.5" />
                    <span>{catalogo.negocio.direccion}</span>
                  </p>
                )}
                {catalogo?.negocio.telefono && (
                  <p className="flex items-center space-x-2">
                    <Phone size={18} className="text-secondary-400" />
                    <span>{catalogo.negocio.telefono}</span>
                  </p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-4">Métodos de pago</h4>
              <div className="flex flex-wrap gap-2">
                {catalogo?.negocio.metodos_pago.map((m) => (
                  <span
                    key={m}
                    className="bg-white/10 rounded-full px-3 py-1 text-xs capitalize"
                  >
                    {m}
                  </span>
                ))}
              </div>
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 mt-6 bg-secondary-500 hover:bg-secondary-600 font-semibold px-5 py-2.5 rounded-lg transition"
              >
                <ShoppingCart size={18} />
                <span>Ingresar al POS</span>
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} FILAM Ferretería Industrial — Sistema de punto de venta
          </div>
        </div>
      </footer>
    </div>
  );
}