import {
  Award,
  Users,
  Factory,
  Hammer,
  TrendingUp,
  HeartHandshake,
  Microscope,
} from "lucide-react";

const RAZONES = [
  {
    icon: Factory,
    title: "Producción propia",
    desc: "Fabricamos nuestras tuberías PVC en planta, garantizando calidad y abastecimiento constante.",
  },
  {
    icon: Microscope,
    title: "Control de calidad",
    desc: "Cada lote pasa por pruebas de presión y norma técnica antes de salir de fábrica.",
  },
  {
    icon: Hammer,
    title: "Venta directa de fábrica",
    desc: "Trabajamos con maestros, empresas constructoras y distribuidores sin intermediarios.",
  },
  {
    icon: TrendingUp,
    title: "Precios de fábrica",
    desc: "Al producir nosotros mismos, ofrecemos el mejor costo del mercado.",
  },
  {
    icon: Users,
    title: "Stock permanente",
    desc: "Línea completa de tuberías y accesorios siempre disponible para tu obra.",
  },
  {
    icon: HeartHandshake,
    title: "Compromiso con tu obra",
    desc: "Asesoría técnica gratuita y garantía en todos nuestros productos.",
  },
];

const MARCAS = [
  "FILAM PVC",
  "TUBERÍAS PVC",
  "DESAGÜE",
  "PRESIÓN",
  "ACCESORIOS",
  "CALIDAD NTP",
];

const STATS = [
  { value: "1,200+", label: "Clientes atendidos" },
  { value: "15+", label: "Líneas de tubería y accesorios" },
  { value: "100%", label: "Producción con control de calidad" },
  { value: "98%", label: "Clientes satisfechos" },
];

export default function WhyUs() {
  return (
    <section id="beneficios" className="bg-steel-950 text-white py-16 lg:py-24">
      <div className="container-site">
        <div className="max-w-2xl mb-14">
          <p className="section-title text-secondary-400">Por qué elegirnos</p>
          <h2 className="section-heading !text-white">
            Tubería PVC fabricada por nosotros, calidad garantizada
          </h2>
          <p className="mt-4 text-steel-300 leading-relaxed">
            FILAM no es una simple distribuidora: producimos nuestras propias
            tuberías y accesorios PVC en Huancayo. Por eso podemos asegurar
            calidad, precio y abastecimiento en cada proyecto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {RAZONES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="group bg-white/[0.04] border border-white/10 rounded-2xl p-7 hover:bg-white/[0.07] hover:border-secondary-400/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-secondary-500/15 border border-secondary-400/30 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon size={22} className="text-secondary-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{r.title}</h3>
                <p className="text-sm text-steel-300/80 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center rounded-2xl border border-white/10 bg-white/[0.03] py-8 px-4"
            >
              <p className="text-4xl font-bold text-secondary-400 mb-2">
                {s.value}
              </p>
              <p className="text-sm text-steel-300">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Marcas */}
        <div className="mt-16">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-steel-400 mb-8">
            Trabajamos con las mejores marcas
          </p>
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-6">
            {MARCAS.map((m) => (
              <span
                key={m}
                className="text-lg font-bold tracking-wide text-steel-500/70 hover:text-steel-200 transition-colors cursor-default"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
