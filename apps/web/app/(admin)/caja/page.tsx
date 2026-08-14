"use client";

import { useEffect, useState } from "react";
import { Wallet, Plus, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CajaSesion {
  id: string;
  estado: "abierta" | "cerrada";
  monto_apertura: number;
  monto_cierre: number | null;
  diferencia: number | null;
  abierta_en: string;
  cerrada_en: string | null;
  _count?: { ventas: number };
}

export default function CajaPage() {
  const { token } = useAccessToken();
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<CajaSesion | null>(null);
  const [showAbrir, setShowAbrir] = useState(false);
  const [montoApertura, setMontoApertura] = useState("200");
  const [showCerrar, setShowCerrar] = useState(false);
  const [montoCierre, setMontoCierre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function cargar() {
    if (!token) return;
    setError("");
    try {
      const [abierta, lista] = await Promise.all([
        api.get<CajaSesion | null>("/caja/abierta", token),
        api.get<CajaSesion[]>("/caja/mis-sesiones", token),
      ]);
      setCajaAbierta(abierta);
      setSesiones(lista);
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

  async function abrirCaja() {
    setError("");
    try {
      await api.post("/caja/abrir", { monto_apertura: Number(montoApertura) || 0 }, token);
      setShowAbrir(false);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cerrarCaja() {
    if (!cajaAbierta) return;
    setError("");
    try {
      await api.post(`/caja/cerrar/${cajaAbierta.id}`, { monto_cierre: Number(montoCierre) || 0 }, token);
      setShowCerrar(false);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando caja...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caja</h1>
          <p className="text-gray-500">Apertura y cierre de turnos</p>
        </div>
        {!cajaAbierta ? (
          <button onClick={() => setShowAbrir(true)} className="btn-primary flex items-center space-x-2">
            <Plus size={20} />
            <span>Abrir caja</span>
          </button>
        ) : (
          <button onClick={() => setShowCerrar(true)} className="btn-secondary flex items-center space-x-2">
            <LogOut size={20} />
            <span>Cerrar caja</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {cajaAbierta && (
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Caja abierta</p>
                <p className="text-sm text-gray-500">
                  Abierta el {formatDate(cajaAbierta.abierta_en)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Apertura</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(cajaAbierta.monto_apertura)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            {cajaAbierta._count?.ventas ?? 0} ventas en este turno
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Historial de turnos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3 font-medium">Apertura</th>
              <th className="px-4 py-3 font-medium text-right">Monto apertura</th>
              <th className="px-4 py-3 font-medium text-right">Monto cierre</th>
              <th className="px-4 py-3 font-medium text-right">Diferencia</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sesiones.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">{formatDate(s.abierta_en)}</td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {formatCurrency(s.monto_apertura)}
                </td>
                <td className="px-4 py-3 text-right text-gray-900">
                  {s.monto_cierre != null ? formatCurrency(s.monto_cierre) : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    s.diferencia == null
                      ? "text-gray-400"
                      : Number(s.diferencia) < 0
                      ? "text-red-600"
                      : Number(s.diferencia) > 0
                      ? "text-amber-600"
                      : "text-green-600"
                  }`}
                >
                  {s.diferencia != null ? formatCurrency(s.diferencia) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      s.estado === "abierta"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {s.estado === "abierta" ? "Abierta" : "Cerrada"}
                  </span>
                </td>
              </tr>
            ))}
            {sesiones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin turnos registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAbrir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Abrir caja</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto de apertura (S/.)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowAbrir(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={abrirCaja} className="btn-primary">
                  Abrir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCerrar && cajaAbierta && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cerrar caja</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Monto de apertura:{" "}
                <span className="font-semibold">{formatCurrency(cajaAbierta.monto_apertura)}</span>
                <br />
                Ventas del turno:{" "}
                <span className="font-semibold">{cajaAbierta._count?.ventas ?? 0}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto final en caja (S/.)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={montoCierre}
                  onChange={(e) => setMontoCierre(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCerrar(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={cerrarCaja} className="btn-secondary">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
