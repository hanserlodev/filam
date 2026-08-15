"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";

interface Configuracion {
  nombre_negocio: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  umbral_diferencia: number;
  formato_impresion: "termica" | "a4";
  metodos_pago: string[];
  actualizado_en: string;
}

const METODOS_DISPONIBLES = ["efectivo", "tarjeta", "yape", "plin"];

export default function ConfiguracionPage() {
  const { token } = useAccessToken();
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [form, setForm] = useState({
    nombre_negocio: "",
    ruc: "",
    direccion: "",
    telefono: "",
    umbral_diferencia: "10",
    formato_impresion: "termica" as "termica" | "a4",
    metodos_pago: ["efectivo", "yape"] as string[],
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<Configuracion>("/configuracion", token)
      .then((c) => {
        setConfig(c);
        setForm({
          nombre_negocio: c.nombre_negocio,
          ruc: c.ruc || "",
          direccion: c.direccion || "",
          telefono: c.telefono || "",
          umbral_diferencia: String(c.umbral_diferencia ?? 10),
          formato_impresion: c.formato_impresion,
          metodos_pago: c.metodos_pago,
        });
      })
      .catch((e) => setError(e.message));
  }, [token]);

  function toggleMetodo(metodo: string) {
    setForm((prev) => ({
      ...prev,
      metodos_pago: prev.metodos_pago.includes(metodo)
        ? prev.metodos_pago.filter((m) => m !== metodo)
        : [...prev.metodos_pago, metodo],
    }));
  }

  async function guardar() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.put(
        "/configuracion",
        {
          nombre_negocio: form.nombre_negocio,
          ruc: form.ruc || undefined,
          direccion: form.direccion || undefined,
          telefono: form.telefono || undefined,
          umbral_diferencia: Number(form.umbral_diferencia) || 10,
          formato_impresion: form.formato_impresion,
          metodos_pago: form.metodos_pago,
        },
        token
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!config && !error) {
    return <div className="text-center py-12 text-gray-500">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500">Datos del negocio y preferencias del sistema</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del negocio
            </label>
            <input
              className="input-field"
              value={form.nombre_negocio}
              onChange={(e) => setForm({ ...form, nombre_negocio: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
            <input
              className="input-field"
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
              placeholder="20XXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              className="input-field"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              className="input-field"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Umbral de diferencia de caja (S/.)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Si al cerrar la caja la diferencia supera este monto, se pedirá un motivo.
          </p>
          <input
            type="number"
            className="input-field max-w-xs"
            value={form.umbral_diferencia}
            onChange={(e) => setForm({ ...form, umbral_diferencia: e.target.value })}
            min="0"
            step="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Formato de impresión
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "termica", label: "Térmica (80mm)" },
              { id: "a4", label: "A4" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setForm({ ...form, formato_impresion: f.id as "termica" | "a4" })}
                className={`p-3 rounded-lg border-2 text-sm font-semibold transition ${
                  form.formato_impresion === f.id
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Métodos de pago habilitados
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {METODOS_DISPONIBLES.map((m) => {
              const activo = form.metodos_pago.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMetodo(m)}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold capitalize transition ${
                    activo
                      ? "border-secondary-500 bg-secondary-50 text-secondary-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button onClick={guardar} disabled={saving} className="btn-primary flex items-center space-x-2">
            <Save size={18} />
            <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">Cambios guardados ✓</span>}
        </div>
      </div>
    </div>
  );
}