import {
  Truck,
  Headphones,
  ShieldCheck,
  RefreshCcw,
  Factory,
  Store,
} from "lucide-react";

const BENEFICIOS = [
  {
    icon: Factory,
    title: "Fábrica de tuberías PVC",
    desc: "Producción propia de tubería y accesorios en nuestra planta de Huancayo",
  },
  {
    icon: Store,
    title: "Ferretería completa",
    desc: "Herramientas, materiales y todo lo necesario para tu obra y hogar",
  },
  {
    icon: ShieldCheck,
    title: "Calidad garantizada",
    desc: "Cumplimos norma técnica NTP en toda la producción",
  },
  {
    icon: Truck,
    title: "Despacho y envíos",
    desc: "Atendemos pedidos para todo Junín y despachos a nivel nacional",
  },
  {
    icon: Headphones,
    title: "Asesoría experta",
    desc: "Te ayudamos a elegir el diámetro y accesorios correctos",
  },
  {
    icon: RefreshCcw,
    title: "Garantía real",
    desc: "Cambiamos cualquier producto con falla de fabricación",
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
