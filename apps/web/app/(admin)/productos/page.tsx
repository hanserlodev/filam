"use client";

import { useEffect, useState } from "react";
import { Plus, Package } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  codigo_barras: string | null;
  sku: string | null;
  precio: number;
  costo: number | null;
  stock: number;
  unidad_medida: string;
  stock_minimo: number;
  activo: boolean;
  categoria: { nombre: string } | null;
}

export default function ProductosPage() {
  const { token } = useAccessToken();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .get<Producto[]>(`/productos${query ? `?q=${encodeURIComponent(query)}` : ""}`, token)
      .then(setProductos)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500">
            {productos.length} productos en el catálogo
          </p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Nuevo producto</span>
        </button>
      </div>

      <input
        type="search"
        className="input-field max-w-md"
        placeholder="Buscar por nombre, código de barras o SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando productos...</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium text-right">Stock</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-right">Costo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p) => {
                const bajoStock = p.stock <= p.stock_minimo;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{p.nombre}</p>
                          <p className="text-xs text-gray-400">
                            {p.sku || p.codigo_barras || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.categoria?.nombre || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-semibold ${
                          bajoStock ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {p.stock}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        {p.unidad_medida}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(p.precio)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {p.costo != null ? formatCurrency(p.costo) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          p.activo
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}