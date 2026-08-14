"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatDate } from "@/lib/utils";

interface Cliente {
  id: string;
  nombre: string | null;
  dni_ruc: string | null;
  telefono: string | null;
  creado_en: string;
  _count?: { ventas: number };
}

export default function ClientesPage() {
  const { token } = useAccessToken();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dniRuc, setDniRuc] = useState("");
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get<Cliente[]>(`/clientes${query ? `?q=${encodeURIComponent(query)}` : ""}`, token)
      .then(setClientes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, query]);

  async function crearCliente() {
    setError("");
    try {
      await api.post("/clientes", { nombre, dni_ruc: dniRuc, telefono }, token);
      setShowModal(false);
      setNombre("");
      setDniRuc("");
      setTelefono("");
      const lista = await api.get<Cliente[]>("/clientes", token);
      setClientes(lista);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Nuevo cliente</span>
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="search"
          className="input-field pl-12"
          placeholder="Buscar por nombre, DNI/RUC o teléfono..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando clientes...</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">DNI/RUC</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium text-right">Ventas</th>
                <th className="px-4 py-3 font-medium">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Users size={18} className="text-gray-500" />
                      </div>
                      <p className="font-medium text-gray-900">{c.nombre || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.dni_ruc || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {c._count?.ventas ?? 0}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.creado_en)}</td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Sin clientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nuevo cliente</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  className="input-field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI / RUC</label>
                <input
                  className="input-field"
                  value={dniRuc}
                  onChange={(e) => setDniRuc(e.target.value)}
                  placeholder="12345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input
                  className="input-field"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="9XXXXXXXX"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowModal(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={crearCliente} className="btn-primary">
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
