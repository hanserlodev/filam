import {
  Award,
  Users,
  Building2,
  Hammer,
  TrendingUp,
  HeartHandshake,
} from "lucide-react";

const RAZONES = [
  {
    icon: Award,
    title: "Trayectoria comprobada",
    desc: "Años abasteciendo a maestros de obra, empresas constructoras y familias.",
  },
  {
    icon: Hammer,
    title: "Asesoría técnica real",
    desc: "Nuestro equipo te orienta sobre el material correcto para cada trabajo.",
  },
  {
    icon: Building2,
    title: "Venta por mayor y menor",
    desc: "Atendemos proyectos grandes y compras del día a día por igual.",
  },
  {
    icon: TrendingUp,
    title: "Precios competitivos",
    desc: "Negociamos directo con distribuidores para ofrecerte el mejor costo.",
  },
  {
    icon: Users,
    title: "Atención personalizada",
    desc: "Conocemos a nuestros clientes y sus proyectos uno a uno.",
  },
  {
    icon: HeartHandshake,
    title: "Compromiso con tu obra",
    desc: "Si el producto no cumple, lo cambiamos sin complicaciones.",
  },
];

const MARCAS = [
  "TRAMONTINA",
  "STANLEY",
  "3M",
  "SOL",
  "BLACK+DECKER",
  "INDECO",
  "TEKNO",
  "FORTREX",
];

const STATS = [
  { value: "500+", label: "Clientes atendidos" },
  { value: "1,200+", label: "Productos disponibles" },
  { value: "30+", label: "Marcas de calidad" },
  { value: "98%", label: "Clientes satisfechos" },
];

export default function WhyUs() {
  return (
    <section id="beneficios" className="bg-steel-950 text-white py-16 lg:py-24">
      <div className="container-site">
        <div className="max-w-2xl mb-14">
          <p className="section-title text-secondary-400">Por qué elegirnos</p>
          <h2 className="section-heading !text-white">
            La ferretería que tu obra necesita
          </h2>
          <p className="mt-4 text-steel-300 leading-relaxed">
            No somos solo una tienda: somos el aliado técnico de cada proyecto.
            Trabajamos junto a ti para que tu construcción salga bien, a tiempo
            y al mejor precio.
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
