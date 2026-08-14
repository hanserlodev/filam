import Link from "next/link";
import {
  Phone,
  MapPin,
  Mail,
  CreditCard,
  Globe,
  Instagram,
  ShieldCheck,
} from "lucide-react";
import Logo from "./Logo";

interface FooterProps {
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  instagram?: string | null;
  metodosPago?: string[];
  ruc?: string | null;
}

export default function Footer({
  direccion,
  telefono,
  email,
  web,
  instagram,
  metodosPago,
  ruc,
}: FooterProps) {
  const metodos = metodosPago?.length ? metodosPago : ["efectivo", "yape", "plin"];
  const labels: Record<string, string> = {
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    yape: "Yape",
    plin: "Plin",
    instagramHandle: (instagram || "@filamcentroplast").replace(/^@/, ""),
  };

  return (
    <footer className="bg-steel-950 text-white">
      <div className="container-site py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="[&_a]:!text-white">
              <Logo />
            </div>
            <p className="text-sm text-steel-300/70 leading-relaxed mt-5">
              Fábrica de tuberías y accesorios PVC de alta calidad en Huancayo,
              con ferretería completa para tu obra. Producción bajo norma
              técnica y precios de fábrica para maestros, empresas y
              distribuidores.
            </p>
            {ruc && (
              <p className="text-xs text-steel-400 mt-4">RUC: {ruc}</p>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-steel-300">
              Enlaces
            </h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#inicio" className="text-steel-300/70 hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#productos" className="text-steel-300/70 hover:text-white transition-colors">Productos</a></li>
              <li><a href="#categorias" className="text-steel-300/70 hover:text-white transition-colors">Categorías</a></li>
              <li><a href="#beneficios" className="text-steel-300/70 hover:text-white transition-colors">Beneficios</a></li>
              <li><Link href="/login" className="text-steel-300/70 hover:text-white transition-colors">Área de ventas</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-steel-300">
              Contacto
            </h4>
            <ul className="space-y-4 text-sm">
              {direccion && (
                <li className="flex items-start gap-3 text-steel-300/70">
                  <MapPin size={18} className="text-secondary-400 mt-0.5 shrink-0" />
                  <span>{direccion}</span>
                </li>
              )}
              {telefono && (
                <li className="flex items-center gap-3 text-steel-300/70">
                  <Phone size={18} className="text-secondary-400 shrink-0" />
                  <a href={`tel:${telefono.replace(/[^0-9+]/g, "")}`} className="hover:text-white transition-colors">
                    {telefono}
                  </a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3 text-steel-300/70">
                  <Mail size={18} className="text-secondary-400 shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors break-all">
                    {email}
                  </a>
                </li>
              )}
            </ul>
            <div className="flex gap-3 mt-5">
              {web && (
                <a
                  href={web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
                  aria-label="Sitio web"
                >
                  <Globe size={16} />
                </a>
              )}
              <a
                href={`https://instagram.com/${(instagram || "@filamcentroplast").replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
                aria-label="Instagram"
              >
                <Instagram size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-widest text-steel-300">
              Métodos de pago
            </h4>
            <div className="flex flex-wrap gap-2">
              {metodos.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-medium capitalize"
                >
                  <CreditCard size={14} className="text-secondary-400" />
                  {labels[m] || m}
                </span>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 bg-white/[0.04] border border-white/10 rounded-xl p-4">
              <ShieldCheck size={20} className="text-secondary-400 shrink-0 mt-0.5" />
              <p className="text-xs text-steel-300/70 leading-relaxed">
                Compra 100% segura. Productos originales con garantía de cambio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-steel-400">
          <p>
            © {new Date().getFullYear()} FILAM Fábrica de Tuberías PVC. Todos los
            derechos reservados.
          </p>
          <p>Punto de venta FILAM · v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
