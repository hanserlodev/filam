"use client";

import { useEffect, useState } from "react";
import { Wallet, Plus, LogOut, Camera, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface ResumenCaja {
  total_efectivo: number;
  total_digital: number;
  total_ingresos: number;
  total_retiros: number;
  efectivo_esperado: number;
  monto_esperado: number;
}

interface Evidencia {
  id: string;
  ruta_archivo: string;
  creado_en: string;
}

interface CajaSesion {
  id: string;
  estado: "abierta" | "cerrada";
  monto_apertura: number;
  monto_cierre: number | null;
  diferencia: number | null;
  total_efectivo?: number | null;
  total_digital?: number | null;
  total_ingresos?: number | null;
  total_retiros?: number | null;
  monto_esperado?: number | null;
  motivo_diferencia?: string | null;
  abierta_en: string;
  cerrada_en: string | null;
  _count?: { ventas: number };
  resumen?: ResumenCaja;
  evidencias?: Evidencia[];
}

export default function CajaPage() {
  const { token } = useAccessToken();
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState<CajaSesion | null>(null);
  const [showAbrir, setShowAbrir] = useState(false);
  const [montoApertura, setMontoApertura] = useState("200");
  const [showCerrar, setShowCerrar] = useState(false);
  const [montoCierre, setMontoCierre] = useState("");
  const [motivoDiferencia, setMotivoDiferencia] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

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
      await api.post(
        `/caja/cerrar/${cajaAbierta.id}`,
        {
          monto_cierre: Number(montoCierre) || 0,
          motivo_diferencia: motivoDiferencia || undefined,
        },
        token
      );
      setShowCerrar(false);
      setMontoCierre("");
      setMotivoDiferencia("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function subirFoto(
    evento: React.ChangeEvent<HTMLInputElement>,
    sesionId: string
  ) {
    const file = evento.target.files?.[0];
    if (!file || !token) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5MB");
      return;
    }
    setError("");
    setSubiendo(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      const ruta = `${sesionId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("evidencias-caja")
        .upload(ruta, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      await api.post(
        `/caja/sesion/${sesionId}/evidencia`,
        { ruta_archivo: ruta, tipo_archivo: file.type, tamano_bytes: file.size },
        token
      );
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  async function verFoto(evidenciaId: string) {
    if (!token) return;
    setError("");
    try {
      const res = await api.get<{ url: string }>(`/caja/evidencia/${evidenciaId}/url`, token);
      window.open(res.url, "_blank");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Cargando caja...</div>;
  }

  const tieneFoto = (s: CajaSesion) => (s.evidencias ?? []).length > 0;

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
              <p className="text-sm text-gray-500">Efectivo esperado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(cajaAbierta.resumen?.efectivo_esperado ?? cajaAbierta.monto_apertura)}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-gray-400">Ventas:</span>{" "}
              <span className="font-semibold text-gray-900">{cajaAbierta._count?.ventas ?? 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Efectivo:</span>{" "}
              <span className="font-semibold text-gray-900">
                {formatCurrency(cajaAbierta.resumen?.total_efectivo ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Digital:</span>{" "}
              <span className="font-semibold text-gray-900">
                {formatCurrency(cajaAbierta.resumen?.total_digital ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Retiros/Ingresos:</span>{" "}
              <span className="font-semibold text-gray-900">
                {formatCurrency((cajaAbierta.resumen?.total_retiros ?? 0) - (cajaAbierta.resumen?.total_ingresos ?? 0))}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Historial de turnos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3 font-medium">Apertura</th>
              <th className="px-4 py-3 font-medium text-right">Apertura</th>
              <th className="px-4 py-3 font-medium text-right">Cierre</th>
              <th className="px-4 py-3 font-medium text-right">Esperado</th>
              <th className="px-4 py-3 font-medium text-right">Diferencia</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sesiones.map((s) => {
              const dif = s.diferencia != null ? Number(s.diferencia) : null;
              const falta = dif != null && dif < 0;
              const sobra = dif != null && dif > 0;
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatDate(s.abierta_en)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {formatCurrency(s.monto_apertura)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {s.monto_cierre != null ? formatCurrency(s.monto_cierre) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {s.monto_esperado != null ? formatCurrency(s.monto_esperado) : "—"}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      dif == null
                        ? "text-gray-400"
                        : falta
                        ? "text-red-600"
                        : sobra
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {dif != null
                      ? `${falta ? "FALTA " : sobra ? "SOBRA " : ""}${formatCurrency(Math.abs(dif))}`
                      : "—"}
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
                  <td className="px-4 py-3">
                    {s.estado === "cerrada" ? (
                      tieneFoto(s) ? (
                        <button
                          onClick={() => verFoto(s.evidencias![0].id)}
                          className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                        >
                          <Eye size={14} /> Ver
                        </button>
                      ) : (
                        <label className="text-xs font-semibold text-amber-600 hover:underline cursor-pointer flex items-center gap-1">
                          <Camera size={14} /> Foto pendiente
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            disabled={subiendo}
                            onChange={(e) => subirFoto(e, s.id)}
                          />
                        </label>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
            {sesiones.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Apertura</span>
                  <span className="font-semibold">{formatCurrency(cajaAbierta.monto_apertura)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Efectivo vendido</span>
                  <span className="font-semibold">
                    {formatCurrency(cajaAbierta.resumen?.total_efectivo ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Ingresos − Retiros</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      (cajaAbierta.resumen?.total_ingresos ?? 0) -
                        (cajaAbierta.resumen?.total_retiros ?? 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Efectivo esperado</span>
                  <span>{formatCurrency(cajaAbierta.resumen?.efectivo_esperado ?? 0)}</span>
                </div>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de diferencia (si aplica)
                </label>
                <input
                  className="input-field"
                  value={motivoDiferencia}
                  onChange={(e) => setMotivoDiferencia(e.target.value)}
                  placeholder="Ej. faltó vuelto"
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
