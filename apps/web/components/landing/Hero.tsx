"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Truck,
  BadgeCheck,
  Wrench,
  Package,
  Building2,
  Users,
  Sparkles,
  Factory,
} from "lucide-react";

interface HeroProps {
  negocioNombre: string;
  totalProductos: number;
  totalCategorias: number;
}

export default function Hero({
  negocioNombre,
  totalProductos,
  totalCategorias,
}: HeroProps) {
  const stats = [
    { value: `${totalProductos}+`, label: "Productos disponibles", icon: Package },
    { value: `${totalCategorias}`, label: "Categorías", icon: Wrench },
    { value: "100%", label: "Calidad certificada", icon: BadgeCheck },
    { value: "24h", label: "Despacho rápido", icon: Truck },
  ];

  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-900 to-primary-950 text-white"
    >
      <div className="absolute inset-0 bg-grid-light bg-[size:36px_36px] opacity-40" />
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-primary-500/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-secondary-500/15 blur-3xl" />

      <div className="relative container-site py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          {/* Texto */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur border border-white/15 rounded-full px-4 py-2 text-sm font-medium mb-7">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              Abierto hoy · Atención al cliente
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
              Fabricamos{" "}
              <span className="relative inline-block">
                <span className="text-secondary-400">tuberías PVC</span>
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-secondary-500/40"
                  viewBox="0 0 200 12"
                  fill="none"
                >
                  <path
                    d="M2 9C50 3 150 3 198 9"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>{" "}
              y vendemos de todo.
            </h1>

            <p className="text-lg text-primary-100/90 leading-relaxed mb-9 max-w-xl">
              {negocioNombre}. Producción propia de tuberías y accesorios PVC
              bajo norma técnica, y ferretería completa con herramientas,
              materiales y todo para tu obra — todo con precios de fábrica.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#productos"
                className="btn-secondary !px-7 !py-4 text-base group"
              >
                Ver catálogo de productos
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </a>
              <Link href="/login" className="btn-white-outline !px-7 !py-4 text-base">
                Área de ventas
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 mt-10">
              <div className="flex items-center gap-2 text-sm text-primary-100/80">
                <Factory size={18} className="text-secondary-400" />
                Fábrica de tuberías PVC
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-100/80">
                <Wrench size={18} className="text-secondary-400" />
                Ferretería completa
              </div>
              <div className="flex items-center gap-2 text-sm text-primary-100/80">
                <Users size={18} className="text-secondary-400" />
                +1,200 clientes
              </div>
            </div>
          </div>

          {/* Stats / Tarjeta visual */}
          <div className="animate-fade-up [animation-delay:150ms]">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-secondary-500/20 to-primary-500/20 rounded-3xl blur-2xl" />
              <div className="relative grid grid-cols-2 gap-4">
                {stats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="group bg-white/[0.07] backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/[0.12] hover:border-secondary-400/40 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="w-11 h-11 bg-secondary-500/15 border border-secondary-400/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon size={22} className="text-secondary-400" />
                      </div>
                      <p className="text-3xl font-bold mb-1">{s.value}</p>
                      <p className="text-sm text-primary-100/70 leading-snug">
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-white/[0.07] backdrop-blur border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-11 h-11 bg-primary-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={22} className="text-primary-300" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    Fábrica y ferretería en un solo lugar
                  </p>
                  <p className="text-xs text-primary-100/60 mt-0.5 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-secondary-400" />
                    Precios de fábrica para maestros y empresas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
