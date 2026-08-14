"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  LogOut,
  Wallet,
  HardHat,
  Printer,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface Producto {
  id: string;
  nombre: string;
  codigo_barras: string | null;
  sku: string | null;
  precio: number;
  stock: number;
  unidad_medida: string;
  stock_minimo: number;
  activo?: boolean;
}

interface CajaSesion {
  id: string;
  estado: "abierta" | "cerrada";
  monto_apertura: number;
  abierta_en?: string;
  _count?: { ventas: number };
}

interface VentaItem {
  producto_id: string;
  cantidad: number;
  precio: number;
  nombre: string;
  unidad_medida: string;
}

interface VentaCreada {
  id: string;
  total: number;
  items: Array<{
    producto: { nombre: string; unidad_medida: string };
    cantidad: number;
    precio_unitario: number;
  }>;
  metodo_pago: string;
  tipo_comprobante: string;
  creado_en: string;
}

type MetodoPago = "efectivo" | "tarjeta" | "yape" | "plin";

const METODOS: Array<{ id: MetodoPago; label: string; icon: typeof Banknote }> = [
  { id: "efectivo", label: "Efectivo", icon: Banknote },
  { id: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { id: "yape", label: "Yape", icon: Smartphone },
  { id: "plin", label: "Plin", icon: Smartphone },
];

export default function PosPage() {
  const router = useRouter();
  const { token } = useAccessToken();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VentaItem[]>([]);
  const [caja, setCaja] = useState<CajaSesion | null>(null);
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCajaModal, setOpenCajaModal] = useState(false);
  const [montoApertura, setMontoApertura] = useState("200");
  const [processing, setProcessing] = useState(false);
  const [ventaCreada, setVentaCreada] = useState<VentaCreada | null>(null);
  const [showExito, setShowExito] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<Producto[]>("/productos", token),
      api.get<CajaSesion | null>("/caja/abierta", token),
    ])
      .then(([prods, cajaRes]) => {
        setProductos(prods.filter((p) => p.activo !== false));
        setCaja(cajaRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const filtrados = query
    ? productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          (p.codigo_barras && p.codigo_barras.includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query.toLowerCase()))
      )
    : productos;

  function agregarProducto(producto: Producto) {
    if (producto.stock <= 0) return;
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto_id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          cantidad: 1,
          precio: Number(producto.precio),
          nombre: producto.nombre,
          unidad_medida: producto.unidad_medida,
        },
      ];
    });
  }

  function cambiarCantidad(producto_id: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) =>
          i.producto_id === producto_id
            ? { ...i, cantidad: Math.max(0, i.cantidad + delta) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  }

  function eliminarItem(producto_id: string) {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id));
  }

  async function abrirCaja() {
    setError("");
    try {
      const nueva = await api.post<CajaSesion>(
        "/caja/abrir",
        { monto_apertura: Number(montoApertura) || 0 },
        token
      );
      setCaja(nueva);
      setOpenCajaModal(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cobrar() {
    if (items.length === 0) {
      setError("Agrega al menos un producto al carrito");
      return;
    }
    setError("");
    setProcessing(true);
    try {
      const venta = await api.post<VentaCreada>(
        "/ventas",
        {
          metodo_pago: metodo,
          items: items.map((i) => ({
            producto_id: i.producto_id,
            cantidad: i.cantidad,
          })),
        },
        token
      );
      setVentaCreada(venta);
      setShowExito(true);
      setItems([]);
      setQuery("");
      searchRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Cargando POS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Barra superior */}
      <header className="bg-primary-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center">
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold leading-tight">FILAM — Punto de Venta</h1>
            <p className="text-xs text-white/70">
              {caja
                ? `Caja abierta (${formatCurrency(caja.monto_apertura)})`
                : "Sin caja abierta"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOpenCajaModal(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition ${
              caja
                ? "bg-white/10 hover:bg-white/20"
                : "bg-secondary-500 hover:bg-secondary-600"
            }`}
          >
            <Wallet size={18} />
            <span>{caja ? "Ver caja" : "Abrir caja"}</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-2 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold px-2">
            ×
          </button>
        </div>
      )}

      {!caja && !showExito && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-amber-800 text-sm font-medium">
            Necesitas abrir una caja para registrar ventas.
          </p>
          <button
            onClick={() => setOpenCajaModal(true)}
            className="btn-secondary text-sm py-2"
          >
            Abrir caja
          </button>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4 overflow-hidden">
        {/* Catálogo */}
        <div className="flex flex-col min-h-0">
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchRef}
              type="search"
              className="input-field pl-12 py-4 text-lg"
              placeholder="Buscar producto, código de barras o SKU..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-4">
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => agregarProducto(p)}
                disabled={p.stock <= 0}
                className={`card p-4 text-left transition ${
                  p.stock <= 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-primary-500 hover:shadow-lg cursor-pointer"
                }`}
              >
                <p className="font-semibold text-gray-900 line-clamp-2 min-h-[40px]">
                  {p.nombre}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {p.sku || p.codigo_barras}
                </p>
                <div className="flex items-end justify-between mt-3">
                  <p className="text-lg font-bold text-primary-600">
                    {formatCurrency(p.precio)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.stock} {p.unidad_medida}
                  </p>
                </div>
              </button>
            ))}
            {filtrados.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                Sin resultados para "{query}"
              </div>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div className="bg-white rounded-xl shadow-md flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900 text-lg">Carrito</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🛒</p>
                <p>El carrito está vacío</p>
                <p className="text-sm">Busca y toca un producto para agregarlo</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.producto_id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm leading-tight">
                        {item.nombre}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatCurrency(item.precio)} × {item.cantidad}{" "}
                        {item.unidad_medida}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarItem(item.producto_id)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => cambiarCantidad(item.producto_id, -1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-8 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => cambiarCantidad(item.producto_id, 1)}
                        className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(item.precio * item.cantidad)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">
                Método de pago
              </p>
              <div className="grid grid-cols-4 gap-2">
                {METODOS.map((m) => {
                  const Icon = m.icon;
                  const activo = metodo === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMetodo(m.id)}
                      className={`flex flex-col items-center space-y-1 p-2 rounded-lg border-2 transition ${
                        activo
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Total</span>
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              onClick={cobrar}
              disabled={!caja || items.length === 0 || processing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center space-x-2 ${
                caja && items.length > 0
                  ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <CreditCard size={22} />
              <span>{processing ? "Procesando..." : "Cobrar"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal abrir caja */}
      {openCajaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {caja ? "Tu caja" : "Abrir caja"}
            </h3>
            {caja ? (
              <div className="space-y-3">
                <p className="text-gray-600">
                  Caja abierta desde hace {new Date(caja.abierta_en ?? Date.now()).toLocaleTimeString("es-PE")}
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Apertura</span>
                    <span className="font-semibold">
                      {formatCurrency(caja.monto_apertura)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ventas</span>
                    <span className="font-semibold">
                      {caja._count?.ventas ?? 0}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setOpenCajaModal(false)}
                  className="btn-outline w-full"
                >
                  Cerrar
                </button>
              </div>
            ) : (
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
                <button onClick={abrirCaja} className="btn-primary w-full">
                  Abrir caja
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal éxito venta */}
      {showExito && ventaCreada && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Venta registrada</h3>
              <p className="text-gray-500">
                Venta #{ventaCreada.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              {ventaCreada.items.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0"
                >
                  <span className="text-gray-700">
                    {item.cantidad} × {item.producto.nombre}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(item.precio_unitario * item.cantidad)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 mt-2 border-t border-gray-200">
                <span className="font-bold">TOTAL</span>
                <span className="font-bold text-lg">
                  {formatCurrency(ventaCreada.total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => window.print()}
                className="btn-outline flex items-center justify-center space-x-2"
              >
                <Printer size={18} />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setShowExito(false)}
                className="btn-primary"
              >
                Nueva venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}