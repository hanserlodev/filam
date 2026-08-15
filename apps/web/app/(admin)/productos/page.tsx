"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Package,
  ScanLine,
  Pencil,
  Globe,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
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
  stock_minimo: number;
  stock_objetivo: number | null;
  unidad_medida: string;
  activo: boolean;
  categoria: { nombre: string } | null;
  categoria_id?: string | null;
}

interface Categoria {
  id: string;
  nombre: string;
  activa: boolean;
}

interface Sugerencia {
  nombre?: string;
  marca?: string;
  presentacion?: string;
  categoria?: string;
  encontrado: boolean;
  fuente: string;
}

const UNIDADES = ["unidad", "kg", "metro", "litro", "caja"];

export default function ProductosPage() {
  const { token } = useAccessToken();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalModo, setModalModo] = useState<"nuevo" | "editar">("nuevo");
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    codigo_barras: "",
    sku: "",
    precio: "",
    costo: "",
    stock_minimo: "5",
    stock_objetivo: "",
    unidad_medida: "unidad",
    categoria_id: "",
    activo: true,
  });
  const [ajustandoId, setAjustandoId] = useState<string | null>(null);
  const [ajusteCantidad, setAjusteCantidad] = useState("");
  const [ajusteMotivo, setAjusteMotivo] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [prods, cats] = await Promise.all([
        api.get<Producto[]>(`/productos${query ? `?q=${encodeURIComponent(query)}` : ""}`, token),
        api.get<Categoria[]>("/categorias", token),
      ]);
      setProductos(prods);
      setCategorias(cats.filter((c) => c.activa !== false));
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
  }, [token, query]);

  function abrirNuevo() {
    setModalModo("nuevo");
    setProductoEditando(null);
    setSugerencia(null);
    setForm({
      nombre: "",
      codigo_barras: "",
      sku: "",
      precio: "",
      costo: "",
      stock_minimo: "5",
      stock_objetivo: "",
      unidad_medida: "unidad",
      categoria_id: categorias[0]?.id ?? "",
      activo: true,
    });
    setShowModal(true);
    setScanning(true);
    window.setTimeout(() => scanRef.current?.focus(), 100);
  }

  function abrirEditar(p: Producto) {
    setModalModo("editar");
    setProductoEditando(p);
    setSugerencia(null);
    setForm({
      nombre: p.nombre,
      codigo_barras: p.codigo_barras ?? "",
      sku: p.sku ?? "",
      precio: String(p.precio),
      costo: p.costo != null ? String(p.costo) : "",
      stock_minimo: String(p.stock_minimo),
      stock_objetivo: p.stock_objetivo != null ? String(p.stock_objetivo) : "",
      unidad_medida: p.unidad_medida,
      categoria_id: p.categoria_id ?? "",
      activo: p.activo,
    });
    setShowModal(true);
    setScanning(false);
  }

  async function manejarEscaneo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const codigo = busqueda.trim();
    if (!codigo) return;
    e.preventDefault();
    setError("");
    try {
      const res = await api.get<{ encontrado: boolean; producto?: Producto; sugerencia?: Sugerencia }>(
        `/productos/buscar/${encodeURIComponent(codigo)}`,
        token
      );
      if (res.encontrado && res.producto) {
        abrirEditar(res.producto);
      } else {
        setSugerencia(res.sugerencia ?? null);
        setForm((prev) => ({
          ...prev,
          nombre: res.sugerencia?.nombre || prev.nombre,
          codigo_barras: codigo,
          costo: prev.costo || "",
          precio: prev.precio || "",
        }));
        setModalModo("nuevo");
        setShowModal(true);
      }
      setBusqueda("");
      setScanning(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function buscarEnWeb() {
    const codigo = form.codigo_barras.trim();
    if (!codigo) return;
    setBuscandoWeb(true);
    setError("");
    try {
      const res = await api.get<{ sugerencia?: Sugerencia }>(
        `/productos/buscar/${encodeURIComponent(codigo)}`,
        token
      );
      if (res.sugerencia?.encontrado) {
        setForm((prev) => ({
          ...prev,
          nombre: res.sugerencia?.nombre || prev.nombre,
        }));
        setSugerencia(res.sugerencia);
      } else {
        setError("No se encontró el producto en la fuente externa. Regístralo manualmente.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBuscandoWeb(false);
    }
  }

  async function guardar() {
    if (!form.nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setError("");
    try {
      const body = {
        nombre: form.nombre,
        codigo_barras: form.codigo_barras || undefined,
        sku: form.sku || undefined,
        precio: Number(form.precio) || 0,
        costo: form.costo ? Number(form.costo) : undefined,
        stock_minimo: Number(form.stock_minimo) || 5,
        stock_objetivo: form.stock_objetivo ? Number(form.stock_objetivo) : undefined,
        unidad_medida: form.unidad_medida,
        categoria_id: form.categoria_id || undefined,
        activo: form.activo,
      };
      if (modalModo === "nuevo") {
        await api.post("/productos", body, token);
      } else {
        await api.patch(`/productos/${productoEditando!.id}`, body, token);
      }
      setShowModal(false);
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function ajustarStock(productoId: string) {
    if (!ajusteMotivo.trim() || !Number(ajusteCantidad)) {
      setError("Indica cantidad y motivo para el ajuste");
      return;
    }
    setError("");
    try {
      await api.post(`/productos/${productoId}/ajustar-stock`, {
        cantidad: Number(ajusteCantidad),
        motivo: ajusteMotivo,
      }, token);
      setAjustandoId(null);
      setAjusteCantidad("");
      setAjusteMotivo("");
      cargar();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const bajoStock = (p: Producto) => p.stock <= p.stock_minimo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500">{productos.length} productos en el catálogo</p>
        </div>
        <button
          onClick={abrirNuevo}
          className="btn-primary flex items-center space-x-2"
        >
          <ScanLine size={20} />
          <span>Registrar con escáner</span>
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
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
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
                <th className="px-4 py-3 font-medium text-right">Mínimo</th>
                <th className="px-4 py-3 font-medium text-right">Precio</th>
                <th className="px-4 py-3 font-medium text-right">Costo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.map((p) => (
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
                  <td className="px-4 py-3 text-gray-600">{p.categoria?.nombre || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${bajoStock(p) ? "text-red-600" : "text-gray-900"}`}>
                      {p.stock}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{p.unidad_medida}</span>
                    {bajoStock(p) && <AlertTriangle size={14} className="inline text-red-500 ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.stock_minimo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(p.precio)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {p.costo != null ? formatCurrency(p.costo) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.activo ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setAjustandoId(p.id)}
                        className="p-1.5 text-secondary-600 hover:bg-secondary-50 rounded-lg"
                        title="Ajustar stock"
                      >
                        <RefreshCcw size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Sin productos en el catálogo
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modalModo === "nuevo" ? "Registrar producto" : `Editar: ${productoEditando?.nombre}`}
            </h3>

            {scanning && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escanea el código de barras y presiona Enter
                </label>
                <input
                  ref={scanRef}
                  className="input-field text-lg text-center"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={manejarEscaneo}
                  placeholder="0000000000000"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  className="input-field"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de barras
                  </label>
                  <div className="flex gap-1">
                    <input
                      className="input-field"
                      value={form.codigo_barras}
                      onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    />
                    <button
                      onClick={buscarEnWeb}
                      disabled={buscandoWeb}
                      className="px-3 bg-primary-600 text-white rounded-lg shrink-0"
                      title="Buscar en internet"
                    >
                      <Globe size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    className="input-field"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="Auto si se deja vacío"
                  />
                </div>
              </div>

              {sugerencia && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-semibold">Datos encontrados en internet</p>
                  <p>Fuente: {sugerencia.fuente}</p>
                  {sugerencia.marca && <p>Marca: {sugerencia.marca}</p>}
                  {sugerencia.presentacion && <p>Presentación: {sugerencia.presentacion}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de venta (S/.)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Costo (S/.)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.costo}
                    onChange={(e) => setForm({ ...form, costo: e.target.value })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de medida
                  </label>
                  <select
                    className="input-field"
                    value={form.unidad_medida}
                    onChange={(e) => setForm({ ...form, unidad_medida: e.target.value })}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    className="input-field"
                    value={form.categoria_id}
                    onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.stock_minimo}
                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock objetivo
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={form.stock_objetivo}
                    onChange={(e) => setForm({ ...form, stock_objetivo: e.target.value })}
                    min="0"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                <span>Activo</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowModal(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={guardar} className="btn-primary">
                  {modalModo === "nuevo" ? "Guardar producto" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ajustandoId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ajustar stock (baja)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a descontar
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={ajusteCantidad}
                  onChange={(e) => setAjusteCantidad(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (merma, rotura, pérdida, conteo)
                </label>
                <input
                  className="input-field"
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Ej. merma por humedad"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setAjustandoId(null)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={() => ajustarStock(ajustandoId)} className="btn-primary">
                  Ajustar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
