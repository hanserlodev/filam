"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  MessageCircle,
  MapPin,
  Truck,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatCurrency } from "@/lib/utils";
import {
  abrirWhatsApp,
  formatearCantidad,
  type DatosPedido,
} from "@/lib/wa-pedido";

interface CartDrawerProps {
  negocio: { nombre: string; telefono: string | null };
}

export default function CartDrawer({ negocio }: CartDrawerProps) {
  const {
    items,
    abierto,
    cerrarCarrito,
    cambiarCantidad,
    eliminar,
    vaciar,
    subtotal,
    cantidadItems,
  } = useCart();

  const [datos, setDatos] = useState<DatosPedido>({
    nombre: "",
    telefono: "",
    modalidad: "recojo",
    direccion: "",
    referencia: "",
  });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!abierto) return null;

  function validar(): string | null {
    if (items.length === 0) return "Tu carrito está vacío";
    if (datos.nombre.trim().length < 2) return "Indica tu nombre";
    if (datos.telefono.trim().length < 6) return "Indica tu teléfono";
    if (
      datos.modalidad === "delivery" &&
      datos.direccion.trim().length < 5
    ) {
      return "Indica la dirección de entrega";
    }
    return null;
  }

  function enviarPedido() {
    setError("");
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setEnviando(true);
    const res = abrirWhatsApp(negocio, items, subtotal, datos);
    setEnviando(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo abrir WhatsApp");
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[60]"
        onClick={cerrarCarrito}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
        className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-steel-100">
          <h2 className="text-lg font-bold text-steel-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary-600" />
            Tu pedido
            {cantidadItems > 0 && (
              <span className="text-xs font-semibold bg-primary-600 text-white rounded-full px-2 py-0.5">
                {cantidadItems}
              </span>
            )}
          </h2>
          <button
            onClick={cerrarCarrito}
            className="p-2 text-steel-400 hover:text-steel-700 rounded-lg hover:bg-steel-100 transition"
            aria-label="Cerrar carrito"
          >
            <X size={22} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 bg-steel-50 rounded-2xl flex items-center justify-center mb-4">
              <ShoppingCart size={32} className="text-steel-400" />
            </div>
            <p className="text-lg font-semibold text-steel-700">
              Tu carrito está vacío
            </p>
            <p className="text-sm text-steel-400 mt-1">
              Agrega productos del catálogo para armar tu pedido.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.producto.id}
                  className="flex items-start justify-between gap-3 border border-steel-100 rounded-xl p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-steel-900 text-sm leading-snug">
                      {item.producto.nombre}
                    </p>
                    <p className="text-xs text-steel-400 mt-0.5">
                      {formatCurrency(item.producto.precio)}{" "}
                      {item.producto.unidad_medida !== "unidad"
                        ? `/ ${item.producto.unidad_medida}`
                        : ""}
                    </p>
                    <p className="text-sm font-bold text-steel-900 mt-1">
                      {formatCurrency(item.producto.precio * item.cantidad)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-steel-50 rounded-lg px-1 py-0.5">
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, -1)}
                        className="p-1.5 text-steel-600 hover:text-primary-600 rounded-md hover:bg-white transition"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold text-steel-800 min-w-[44px] text-center">
                        {formatearCantidad(
                          item.cantidad,
                          item.producto.unidad_medida
                        )}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.producto.id, 1)}
                        className="p-1.5 text-steel-600 hover:text-primary-600 rounded-md hover:bg-white transition"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => eliminar(item.producto.id)}
                      className="p-2 text-steel-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                      aria-label={`Eliminar ${item.producto.nombre}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-steel-100 px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-steel-500 text-sm">Subtotal referencial</span>
                <span className="text-xl font-bold text-steel-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="text-[11px] text-steel-400 leading-relaxed">
                El precio final y el costo de delivery (si aplica) se confirman
                por WhatsApp antes de completar el pedido.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    setDatos((d) => ({ ...d, modalidad: "recojo" }))
                  }
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    datos.modalidad === "recojo"
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-steel-100 text-steel-500 hover:border-primary-300"
                  }`}
                >
                  <MapPin size={18} />
                  Recojo en tienda
                </button>
                <button
                  onClick={() =>
                    setDatos((d) => ({ ...d, modalidad: "delivery" }))
                  }
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition ${
                    datos.modalidad === "delivery"
                      ? "border-primary-600 bg-primary-50 text-primary-700"
                      : "border-steel-100 text-steel-500 hover:border-primary-300"
                  }`}
                >
                  <Truck size={18} />
                  Delivery
                </button>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={datos.nombre}
                  onChange={(e) =>
                    setDatos((d) => ({ ...d, nombre: e.target.value }))
                  }
                  placeholder="Tu nombre"
                  className="input-field"
                  aria-label="Tu nombre"
                />
                <input
                  type="tel"
                  value={datos.telefono}
                  onChange={(e) =>
                    setDatos((d) => ({ ...d, telefono: e.target.value }))
                  }
                  placeholder="Tu teléfono"
                  className="input-field"
                  aria-label="Tu teléfono"
                />
                {datos.modalidad === "delivery" && (
                  <>
                    <input
                      type="text"
                      value={datos.direccion}
                      onChange={(e) =>
                        setDatos((d) => ({ ...d, direccion: e.target.value }))
                      }
                      placeholder="Dirección de entrega"
                      className="input-field"
                      aria-label="Dirección de entrega"
                    />
                    <input
                      type="text"
                      value={datos.referencia}
                      onChange={(e) =>
                        setDatos((d) => ({ ...d, referencia: e.target.value }))
                      }
                      placeholder="Referencia (opcional)"
                      className="input-field"
                      aria-label="Referencia"
                    />
                  </>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={vaciar}
                  className="btn-outline text-sm"
                  aria-label="Vaciar carrito"
                >
                  Vaciar
                </button>
                <button
                  onClick={enviarPedido}
                  disabled={enviando}
                  className="btn-primary flex items-center justify-center gap-2 !py-3 text-sm"
                >
                  <MessageCircle size={18} />
                  {enviando ? "Abriendo..." : "Pedir por WhatsApp"}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
