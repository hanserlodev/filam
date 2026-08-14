"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  costo: number | null;
  unidad_medida: string;
}

interface Compra {
  id: string;
  proveedor_nombre: string | null;
  total: number;
  creado_en: string;
  usuario: { nombre: string | null };
  items: Array<{
    cantidad: number;
    costo_unitario: number;
    producto: { nombre: string };
  }>;
}

interface ItemCompra {
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
  nombre?: string;
}

export default function ComprasPage() {
  const { token } = useAccessToken();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [proveedor, setProveedor] = useState("");
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<Compra[]>("/compras", token),
      api.get<Producto[]>("/productos", token),
    ])
      .then(([c, p]) => {
        setCompras(c);
        setProductos(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  function agregarItem(producto_id: string) {
    const prod = productos.find((p) => p.id === producto_id);
    if (!prod) return;
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === producto_id);
      if (existente) {
        return prev.map((i) =>
          i.producto_id === producto_id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          producto_id,
          cantidad: 1,
          costo_unitario: Number(prod.costo || 0),
          nombre: prod.nombre,
        },
      ];
    });
  }

  const totalCompra = items.reduce(
    (sum, i) => sum + i.cantidad * i.costo_unitario,
    0
  );

  async function registrarCompra() {
    if (items.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post(
        "/compras",
        {
          proveedor_nombre: proveedor || undefined,
          items: items.map((i) => ({
            producto_id: i.producto_id,
            cantidad: i.cantidad,
            costo_unitario: i.costo_unitario,
          })),
        },
        token
      );
      setShowModal(false);
      setItems([]);
      setProveedor("");
      const [c, p] = await Promise.all([
        api.get<Compra[]>("/compras", token),
        api.get<Producto[]>("/productos", token),
      ]);
      setCompras(c);
      setProductos(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-500">Ingreso de mercadería y reposición de stock</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Nueva compra</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando compras...</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Ítems</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Registrada por</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Truck size={18} className="text-gray-500" />
                      </div>
                      <p className="font-medium text-gray-900">
                        {c.proveedor_nombre || "Proveedor general"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.items.map((i) => `${i.cantidad} × ${i.producto.nombre}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(c.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.usuario.nombre || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.creado_en)}</td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Sin compras registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva compra</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <input
                  className="input-field"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agregar productos
                </label>
                <select
                  className="input-field"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      agregarItem(e.target.value);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">Selecciona un producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (stock: {p.stock} {p.unidad_medida})
                    </option>
                  ))}
                </select>
              </div>

              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.producto_id} className="p-3">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-gray-900 text-sm">{item.nombre}</p>
                        <button
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((i) => i.producto_id !== item.producto_id)
                            )
                          }
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cantidad</label>
                          <input
                            type="number"
                            className="input-field py-2"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.producto_id === item.producto_id
                                    ? { ...i, cantidad: Number(e.target.value) || 0 }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Costo unitario (S/.)
                          </label>
                          <input
                            type="number"
                            className="input-field py-2"
                            min="0"
                            step="0.01"
                            value={item.costo_unitario}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.producto_id === item.producto_id
                                    ? {
                                        ...i,
                                        costo_unitario: Number(e.target.value) || 0,
                                      }
                                    : i
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(totalCompra)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setItems([]);
                  }}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarCompra}
                  disabled={items.length === 0 || saving}
                  className={`btn-primary ${items.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {saving ? "Registrando..." : "Registrar compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}