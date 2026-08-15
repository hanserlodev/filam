"use client";

import { useEffect, useState } from "react";
import { Undo2, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Venta {
  id: string;
  total: number;
  subtotal: number;
  descuento_monto: number;
  motivo_descuento: string | null;
  venta_bajo_costo: boolean;
  metodo_pago: string;
  anulada: boolean;
  anulada_por_id: string | null;
  motivo_anulacion: string | null;
  creado_en: string;
  vendedor: { nombre: string | null } | null;
  pagos: Array<{ metodo_pago: string; monto: number }>;
  items: Array<{ producto: { nombre: string }; cantidad: number }>;
}

export default function VentasPage() {
  const { token } = useAccessToken();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  async function cargar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const lista = await api.get<Venta[]>("/ventas?soloActivas=false", token);
      setVentas(lista);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function anular(id: string) {
    if (!motivo.trim() || motivo.trim().length < 3) {
      setError("Indica un motivo válido para anular la venta");
      return;
    }
    if (!confirm("¿Anular esta venta? Se devolverá el stock y no contará en el cuadre de caja.")) {
      return;
    }
    setAnulandoId(id);
    setError("");
    try {
      await api.post(`/ventas/anular/${id}`, { motivo }, token);
      setMotivo("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnulandoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
        <p className="text-gray-500">Historial y anulación de ventas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando ventas...</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Vendedor</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Pagos</th>
                <th className="px-4 py-3 font-medium text-right">Descuento</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map((v) => (
                <tr key={v.id} className={v.anulada ? "opacity-60 bg-red-50/40" : "hover:bg-gray-50"}>
                  <td className="px-4 py-3 text-gray-600">{formatDate(v.creado_en)}</td>
                  <td className="px-4 py-3 text-gray-600">{v.vendedor?.nombre || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {v.items.map((i) => `${i.cantidad} × ${i.producto.nombre}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {(v.pagos ?? [])
                      .map((p) => `${p.metodo_pago} ${formatCurrency(p.monto)}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {Number(v.descuento_monto) > 0 ? (
                      <span
                        className="font-semibold text-green-600"
                        title={v.motivo_descuento || "regateo"}
                      >
                        -{formatCurrency(v.descuento_monto)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {v.venta_bajo_costo && (
                      <span className="block text-[10px] font-bold text-amber-600 mt-1">
                        BAJO COSTO
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(v.total)}
                  </td>
                  <td className="px-4 py-3">
                    {v.anulada ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                        Anulada
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                        Activa
                      </span>
                    )}
                    {v.motivo_anulacion && (
                      <p className="text-xs text-gray-400 mt-1">{v.motivo_anulacion}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!v.anulada ? (
                      <details className="relative">
                        <summary className="cursor-pointer text-xs font-semibold text-red-600 hover:underline flex items-center gap-1">
                          <Undo2 size={14} /> Anular
                        </summary>
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Motivo de anulación
                          </label>
                          <input
                            className="input-field !py-2 text-sm"
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Ej. cliente se arrepintió, error de cobro"
                          />
                          <button
                            onClick={() => anular(v.id)}
                            disabled={anulandoId === v.id}
                            className="btn-danger w-full mt-2 !py-2 text-sm"
                          >
                            {anulandoId === v.id ? "Anulando..." : "Confirmar anulación"}
                          </button>
                        </div>
                      </details>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    <ShoppingCart className="inline mb-2" size={28} />
                    <p>Sin ventas registradas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
