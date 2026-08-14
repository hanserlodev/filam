import {
  Truck,
  Tag,
  Headphones,
  ShieldCheck,
  RefreshCcw,
  CreditCard,
} from "lucide-react";

const BENEFICIOS = [
  {
    icon: Truck,
    title: "Despacho rápido",
    desc: "Entrega el mismo día en Lima y alrededores",
  },
  {
    icon: Tag,
    title: "Mejores precios",
    desc: "Precios de mayorista en todos nuestros productos",
  },
  {
    icon: ShieldCheck,
    title: "Productos originales",
    desc: "Trabajamos solo con marcas certificadas",
  },
  {
    icon: CreditCard,
    title: "Pago flexible",
    desc: "Efectivo, tarjeta, Yape y Plin",
  },
  {
    icon: Headphones,
    title: "Asesoría experta",
    desc: "Te ayudamos a elegir el producto correcto",
  },
  {
    icon: RefreshCcw,
    title: "Cambios garantizados",
    desc: "Cambiamos productos en mal estado sin problema",
  },
];

export default function TrustBar() {
  return (
    <section className="bg-white border-b border-steel-100">
      <div className="container-site py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
          {BENEFICIOS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={24} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-steel-900">{b.title}</h3>
                  <p className="text-sm text-steel-500 mt-0.5 leading-snug">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
