"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Truck,
  Trash2,
  ScanLine,
  Undo2,
  PackagePlus,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  costo: number | null;
  precio: number;
  unidad_medida: string;
  codigo_barras: string | null;
  sku: string | null;
  categoria_id?: string | null;
}

interface Compra {
  id: string;
  proveedor_nombre: string | null;
  documento_numero: string | null;
  documento_tipo: string | null;
  estado: string;
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

interface Categoria {
  id: string;
  nombre: string;
  activa?: boolean;
}

export default function ComprasPage() {
  const { token } = useAccessToken();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [proveedor, setProveedor] = useState("");
  const [docTipo, setDocTipo] = useState("factura");
  const [docNumero, setDocNumero] = useState("");
  const [items, setItems] = useState<ItemCompra[]>([]);
  const [saving, setSaving] = useState(false);
  const [scan, setScan] = useState("");
  const [showProductoRapido, setShowProductoRapido] = useState(false);
  const [rapidoNombre, setRapidoNombre] = useState("");
  const [rapidoBarras, setRapidoBarras] = useState("");
  const [rapidoCosto, setRapidoCosto] = useState("");
  const [rapidoPrecio, setRapidoPrecio] = useState("");
  const [rapidoCategoria, setRapidoCategoria] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [c, p, cats] = await Promise.all([
        api.get<Compra[]>("/compras", token),
        api.get<Producto[]>("/productos", token),
        api.get<Categoria[]>("/categorias", token),
      ]);
      setCompras(c);
      setProductos(p);
      setCategorias(cats.filter((x) => x.activa !== false));
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

  function agregarPorBarras(codigo: string) {
    const prod = productos.find(
      (p) => p.codigo_barras === codigo || p.sku === codigo
    );
    if (!prod) {
      setRapidoBarras(codigo);
      setShowProductoRapido(true);
      return;
    }
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === prod.id);
      if (existente) {
        return prev.map((i) =>
          i.producto_id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          producto_id: prod.id,
          cantidad: 1,
          costo_unitario: Number(prod.costo || 0),
          nombre: prod.nombre,
        },
      ];
    });
  }

  function manejarEscaner(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const codigo = scan.trim();
    if (!codigo) return;
    e.preventDefault();
    agregarPorBarras(codigo);
    setScan("");
  }

  const totalCompra = items.reduce(
    (sum, i) => sum + i.cantidad * i.costo_unitario,
    0
  );

  async function crearProductoRapido() {
    if (!rapidoNombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError("");
    try {
      const prod = await api.post<Producto>(
        "/compras/producto-rapido",
        {
          nombre: rapidoNombre,
          codigo_barras: rapidoBarras || undefined,
          costo: rapidoCosto ? Number(rapidoCosto) : undefined,
          precio: rapidoPrecio ? Number(rapidoPrecio) : undefined,
          categoria_id: rapidoCategoria || undefined,
        },
        token
      );
      setProductos((prev) => [...prev, prod]);
      setShowProductoRapido(false);
      setRapidoNombre("");
      setRapidoBarras("");
      setRapidoCosto("");
      setRapidoPrecio("");
      agregarPorBarras(prod.codigo_barras ?? prod.sku ?? "");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function registrarCompra() {
    if (items.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await api.post(
        "/compras",
        {
          proveedor_nombre: proveedor || undefined,
          documento_tipo: docTipo,
          documento_numero: docNumero || undefined,
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
      setDocNumero("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function anularCompra(id: string) {
    const motivo = prompt("Motivo de la anulación/devolución:");
    if (!motivo || motivo.trim().length < 3) {
      setError("El motivo es obligatorio (mínimo 3 caracteres)");
      return;
    }
    if (!confirm("¿Anular/devolver esta compra? Se restará el stock recibido.")) return;
    setError("");
    try {
      await api.post(`/compras/${id}/anular`, { motivo }, token);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const estadoLabel: Record<string, string> = {
    registrada: "Registrada",
    anulada: "Anulada",
    devuelta: "Devuelta",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compras</h1>
          <p className="text-gray-500">Recepción de mercadería y reposición de stock</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            window.setTimeout(() => scanRef.current?.focus(), 100);
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <ScanLine size={20} />
          <span>Nueva recepción</span>
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
                <th className="px-4 py-3 font-medium">Documento</th>
                <th className="px-4 py-3 font-medium">Ítems</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {compras.map((c) => (
                <tr key={c.id} className={c.estado !== "registrada" ? "opacity-60" : "hover:bg-gray-50"}>
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
                    {c.documento_tipo && c.documento_numero
                      ? `${c.documento_tipo} ${c.documento_numero}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.items.map((i) => `${i.cantidad} × ${i.producto.nombre}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(c.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        c.estado === "registrada"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {estadoLabel[c.estado] || c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(c.creado_en)}</td>
                  <td className="px-4 py-3">
                    {c.estado === "registrada" && (
                      <button
                        onClick={() => anularCompra(c.id)}
                        className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Undo2 size={14} /> Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {compras.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nueva recepción</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escanea cada producto (código de barras o SKU)
                </label>
                <input
                  ref={scanRef}
                  className="input-field text-lg text-center"
                  value={scan}
                  onChange={(e) => setScan(e.target.value)}
                  onKeyDown={manejarEscaner}
                  placeholder="Escanear producto..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    className="input-field"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de documento
                  </label>
                  <select
                    className="input-field"
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value)}
                  >
                    <option value="factura">Factura</option>
                    <option value="boleta">Boleta</option>
                    <option value="guia">Guía</option>
                    <option value="referencia">Referencia</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de documento
                  </label>
                  <input
                    className="input-field"
                    value={docNumero}
                    onChange={(e) => setDocNumero(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {items.map((item) => {
                    const prod = productos.find((p) => p.id === item.producto_id);
                    return (
                      <div key={item.producto_id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.nombre}</p>
                            <p className="text-xs text-gray-400">
                              Stock actual: {prod?.stock ?? "?"} {prod?.unidad_medida ?? ""}
                            </p>
                          </div>
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
                    );
                  })}
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
                  {saving ? "Registrando..." : "Confirmar recepción"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductoRapido && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PackagePlus size={20} className="text-primary-600" />
              Producto no registrado
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  className="input-field"
                  value={rapidoNombre}
                  onChange={(e) => setRapidoNombre(e.target.value)}
                  placeholder='Ej. Tubo PVC 3"'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    className="input-field"
                    value={rapidoBarras}
                    onChange={(e) => setRapidoBarras(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    className="input-field"
                    value={rapidoCategoria}
                    onChange={(e) => setRapidoCategoria(e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo (S/.)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={rapidoCosto}
                    onChange={(e) => setRapidoCosto(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio (S/.)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={rapidoPrecio}
                    onChange={(e) => setRapidoPrecio(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowProductoRapido(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={crearProductoRapido} className="btn-primary">
                  Crear y agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
