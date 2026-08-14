import { Star, Quote, Clock, MapPin, MessageCircle, Mail, Globe, Instagram } from "lucide-react";
import Link from "next/link";

const TESTIMONIOS = [
  {
    nombre: "Carlos Rojas",
    rol: "Maestro de obra",
    texto:
      "Encuentro todo lo que necesito sin dar vueltas por otras ferreterías. Buenos precios y el asesor siempre sabe qué material recomendar.",
    inicial: "CR",
  },
  {
    nombre: "María Gutiérrez",
    rol: "Diseñadora de interiores",
    texto:
      "Excelente atención y variedad de acabados y pintura. Hago todos mis pedidos ahí y nunca me han quedado mal.",
    inicial: "MG",
  },
  {
    nombre: "Constructora Los Andes",
    rol: "Empresa constructora",
    texto:
      "Nos abastecen de material por proyecto completo. Precios de mayorista y entrega puntual. Un socio confiable para nuestra operación.",
    inicial: "CL",
  },
];

const HORARIOS = [
  { dia: "Lunes a Viernes", hora: "8:00 am – 7:00 pm" },
  { dia: "Sábados", hora: "8:00 am – 6:00 pm" },
  { dia: "Domingos", hora: "8:00 am – 1:00 pm" },
];

interface Props {
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  instagram?: string | null;
}

export default function TestimoniosYContacto({
  direccion,
  telefono,
  email,
  web,
  instagram,
}: Props) {
  return (
    <>
      {/* Testimonios */}
      <section className="bg-steel-50/60 py-16 lg:py-24">
        <div className="container-site">
          <div className="max-w-2xl mb-12">
            <p className="section-title">Testimonios</p>
            <h2 className="section-heading">
              Lo que dicen quienes confían en nosotros
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIOS.map((t) => (
              <figure
                key={t.nombre}
                className="bg-white rounded-2xl p-7 border border-steel-100 shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <Quote size={28} className="text-secondary-400 mb-4" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} size={15} className="fill-secondary-400 text-secondary-400" />
                  ))}
                </div>
                <blockquote className="text-steel-600 leading-relaxed mb-6">
                  “{t.texto}”
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <span className="w-11 h-11 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {t.inicial}
                  </span>
                  <div>
                    <p className="font-semibold text-steel-900">{t.nombre}</p>
                    <p className="text-xs text-steel-400">{t.rol}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="bg-white py-16 lg:py-24">
        <div className="container-site">
          <div className="max-w-2xl mb-12">
            <p className="section-title">Contacto</p>
            <h2 className="section-heading">Visítanos o escríbenos</h2>
            <p className="mt-4 text-steel-500 leading-relaxed">
              Estamos listos para ayudarte con tu próximo proyecto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center mb-4">
                <MapPin size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-2">Dirección</h3>
              <p className="text-sm text-steel-500 leading-relaxed">
                {direccion || "Carretera Central KM 10.5 - Hualhuas, Huancayo"}
              </p>
            </div>

            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-xl flex items-center justify-center mb-4">
                <MessageCircle size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-2">Teléfono</h3>
              <a
                href={telefono ? `tel:${telefono.replace(/[^0-9+]/g, "")}` : "#"}
                className="text-sm text-steel-500 hover:text-primary-600 transition-colors"
              >
                {telefono || "950 307 510"}
              </a>
            </div>

            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center mb-4">
                <Mail size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-2">Email</h3>
              <a
                href={email ? `mailto:${email}` : "#"}
                className="text-sm text-steel-500 hover:text-primary-600 transition-colors break-all"
              >
                {email || "ventas@filamcentroplast.com"}
              </a>
            </div>

            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-xl flex items-center justify-center mb-4">
                <Globe size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-2">Sitio web</h3>
              <a
                href={web || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-steel-500 hover:text-primary-600 transition-colors break-all"
              >
                {web ? web.replace(/^https?:\/\//, "") : "filamcentroplast.com"}
              </a>
            </div>

            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-xl flex items-center justify-center mb-4">
                <Instagram size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-2">Instagram</h3>
              <a
                href={`https://instagram.com/${(instagram || "@filamcentroplast").replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-steel-500 hover:text-primary-600 transition-colors"
              >
                {instagram || "@filamcentroplast"}
              </a>
            </div>

            <div className="bg-steel-50/60 rounded-2xl p-7 border border-steel-100">
              <div className="w-12 h-12 bg-secondary-500 text-white rounded-xl flex items-center justify-center mb-4">
                <Clock size={22} />
              </div>
              <h3 className="font-semibold text-steel-900 mb-3">Horario</h3>
              <div className="space-y-1.5">
                {HORARIOS.map((h) => (
                  <div
                    key={h.dia}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-steel-500">{h.dia}</span>
                    <span className="font-semibold text-steel-700">{h.hora}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link href="/login" className="btn-primary !px-8 !py-4 text-base">
              Ingresar al sistema de ventas
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
