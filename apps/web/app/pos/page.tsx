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
  LayoutDashboard,
  Camera,
  ArrowDownLeft,
  ArrowUpRight,
  X,
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

interface ResumenCaja {
  total_efectivo: number;
  total_digital: number;
  total_ingresos: number;
  total_retiros: number;
  efectivo_esperado: number;
  monto_esperado: number;
}

interface CajaSesion {
  id: string;
  estado: "abierta" | "cerrada";
  monto_apertura: number;
  abierta_en?: string;
  _count?: { ventas: number };
  resumen?: ResumenCaja;
  evidencias?: Array<{ id: string; ruta_archivo: string }>;
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

type MetodoPago = "efectivo" | "tarjeta" | "yape" | "plin" | "transferencia";

interface PagoLinea {
  metodo: MetodoPago;
  monto: string;
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCajaModal, setOpenCajaModal] = useState(false);
  const [montoApertura, setMontoApertura] = useState("200");
  const [montoCierre, setMontoCierre] = useState("");
  const [motivoDiferencia, setMotivoDiferencia] = useState("");
  const [cerrandoCaja, setCerrandoCaja] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ventaCreada, setVentaCreada] = useState<VentaCreada | null>(null);
  const [showExito, setShowExito] = useState(false);
  const [showPagos, setShowPagos] = useState(false);
  const [pagos, setPagos] = useState<PagoLinea[]>([
    { metodo: "efectivo", monto: "" },
  ]);
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [movTipo, setMovTipo] = useState<"ingreso" | "retiro">("ingreso");
  const [movMonto, setMovMonto] = useState("");
  const [movMotivo, setMovMotivo] = useState("");
  const [fotoPendiente, setFotoPendiente] = useState(false);
  const [cajaFotoId, setCajaFotoId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  async function cargarCaja() {
    if (!token) return;
    try {
      const [cajaRes, sesiones] = await Promise.all([
        api.get<CajaSesion | null>("/caja/abierta", token),
        api.get<CajaSesion[]>("/caja/mis-sesiones", token),
      ]);
      setCaja(cajaRes);
      const pendiente = sesiones.find(
        (sesion) => sesion.estado === "cerrada" && !(sesion.evidencias ?? []).length
      );
      setCajaFotoId(pendiente?.id ?? null);
      setFotoPendiente(Boolean(pendiente));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<Producto[]>("/productos", token),
      api.get<CajaSesion | null>("/caja/abierta", token),
      api.get<CajaSesion[]>("/caja/mis-sesiones", token),
    ])
      .then(([prods, cajaRes, sesiones]) => {
        setProductos(prods.filter((p) => p.activo !== false));
        setCaja(cajaRes);
        const pendiente = sesiones.find(
          (sesion) => sesion.estado === "cerrada" && !(sesion.evidencias ?? []).length
        );
        setCajaFotoId(pendiente?.id ?? null);
        setFotoPendiente(Boolean(pendiente));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  const sumaPagos = pagos.reduce(
    (sum, p) => sum + (Number(p.monto) || 0),
    0
  );
  const faltaPago = total - sumaPagos;

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

  function abrirCobro() {
    if (items.length === 0) {
      setError("Agrega al menos un producto al carrito");
      return;
    }
    setPagos([{ metodo: "efectivo", monto: "" }]);
    setShowPagos(true);
  }

  function pagoRapido(metodo: MetodoPago) {
    setPagos([{ metodo, monto: String(total) }]);
  }

  function actualizarPago(index: number, monto: string) {
    setPagos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, monto } : p))
    );
  }

  function quitarPago(index: number) {
    setPagos((prev) => prev.filter((_, i) => i !== index));
  }

  function agregarMetodoPago() {
    setPagos((prev) => {
      const usados = prev.map((p) => p.metodo);
      const disponible = METODOS.find((m) => !usados.includes(m.id));
      if (!disponible) return prev;
      const restante = total - prev.reduce((s, p) => s + (Number(p.monto) || 0), 0);
      return [...prev, { metodo: disponible.id, monto: restante > 0 ? String(restante) : "" }];
    });
  }

  async function cobrar() {
    if (Math.abs(sumaPagos - total) > 0.001) {
      setError(
        `La suma de pagos (${formatCurrency(sumaPagos)}) no coincide con el total (${formatCurrency(total)})`
      );
      return;
    }
    setError("");
    setProcessing(true);
    try {
      const venta = await api.post<VentaCreada>(
        "/ventas",
        {
          items: items.map((i) => ({
            producto_id: i.producto_id,
            cantidad: i.cantidad,
          })),
          pagos: pagos
            .filter((p) => Number(p.monto) > 0)
            .map((p) => ({ metodo_pago: p.metodo, monto: Number(p.monto) })),
        },
        token
      );
      setVentaCreada(venta);
      setShowExito(true);
      setShowPagos(false);
      setItems([]);
      setQuery("");
      await cargarCaja();
      searchRef.current?.focus();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
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
      await cargarCaja();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cerrarCaja() {
    if (!caja) return;
    setError("");
    setCerrandoCaja(true);
    try {
      await api.post(
        `/caja/cerrar/${caja.id}`,
        {
          monto_cierre: Number(montoCierre) || 0,
          motivo_diferencia: motivoDiferencia || undefined,
        },
        token
      );
      setCaja(null);
      setOpenCajaModal(false);
      setMontoCierre("");
      setMotivoDiferencia("");
      setCajaFotoId(caja.id);
      setFotoPendiente(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCerrandoCaja(false);
    }
  }

  async function registrarMovimiento() {
    setError("");
    try {
      await api.post(
        "/caja/movimiento",
        { tipo: movTipo, monto: Number(movMonto) || 0, motivo: movMotivo },
        token
      );
      setShowMovimiento(false);
      setMovMonto("");
      setMovMotivo("");
      await cargarCaja();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function subirFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const sesionId = caja?.id ?? cajaFotoId;
    if (!sesionId || !token) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar 5MB");
      return;
    }
    setError("");
    try {
      const session = await supabase.auth.getSession();
      const userId = session.data.session?.user.id;
      if (!userId) throw new Error("Sesión de usuario no disponible");
      const ruta = `${userId}/${sesionId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("evidencias-caja")
        .upload(ruta, file, { cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      await api.post(
        `/caja/sesion/${sesionId}/evidencia`,
        {
          ruta_archivo: ruta,
          tipo_archivo: file.type,
          tamano_bytes: file.size,
        },
        token
      );
      setFotoPendiente(false);
      setCajaFotoId(null);
    } catch (e) {
      setError((e as Error).message);
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

  const resumen = caja?.resumen;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-primary-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center">
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold leading-tight">FILAM — Punto de Venta</h1>
            <p className="text-xs text-white/70">
              {caja
                ? `Caja abierta · Efectivo esperado: ${formatCurrency(resumen?.efectivo_esperado ?? 0)}`
                : "Sin caja abierta"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition bg-white/10 hover:bg-white/20"
          >
            <LayoutDashboard size={18} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
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

      {fotoPendiente && !caja && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <p className="text-amber-800 text-sm font-medium">
            Tienes una caja cerrada sin foto del arqueo.
          </p>
          <label className="btn-secondary text-sm py-2 cursor-pointer">
            <Camera size={16} className="inline mr-1" />
            Subir foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={subirFoto}
            />
          </label>
        </div>
      )}

      {!caja && !fotoPendiente && !showExito && (
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4 overflow-hidden">
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
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const code = query.trim().toLowerCase();
                const producto = productos.find(
                  (item) =>
                    item.codigo_barras?.toLowerCase() === code ||
                    item.sku?.toLowerCase() === code
                );
                if (!producto) return;
                e.preventDefault();
                agregarProducto(producto);
                setQuery("");
                searchRef.current?.focus();
              }}
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
                Sin resultados para &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">Carrito</h2>
            {caja && (
              <button
                onClick={() => setShowMovimiento(true)}
                className="text-xs font-semibold text-primary-600 hover:underline"
              >
                Retiro / Ingreso
              </button>
            )}
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
            <div className="flex items-center justify-between">
              <span className="text-gray-500 font-medium">Total</span>
              <span className="text-3xl font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              onClick={abrirCobro}
              disabled={!caja || items.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center space-x-2 ${
                caja && items.length > 0
                  ? "bg-primary-600 hover:bg-primary-700 text-white shadow-lg"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              <CreditCard size={22} />
              <span>Cobrar</span>
            </button>
          </div>
        </div>
      </div>

      {openCajaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {caja ? "Tu caja" : "Abrir caja"}
            </h3>
            {caja ? (
              <div className="space-y-3">
                <p className="text-gray-600">
                  Caja abierta desde hace{" "}
                  {caja.abierta_en
                    ? new Date(caja.abierta_en).toLocaleTimeString("es-PE")
                    : "—"}
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Apertura</span>
                    <span className="font-semibold">
                      {formatCurrency(caja.monto_apertura)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Efectivo vendido</span>
                    <span className="font-semibold">
                      {formatCurrency(resumen?.total_efectivo ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Digital (Yape/Plin/Tarjeta)</span>
                    <span className="font-semibold">
                      {formatCurrency(resumen?.total_digital ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <ArrowDownLeft size={14} /> Ingresos
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(resumen?.total_ingresos ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight size={14} /> Retiros
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(resumen?.total_retiros ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-gray-900">
                    <span>Efectivo esperado</span>
                    <span>{formatCurrency(resumen?.efectivo_esperado ?? 0)}</span>
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
                {motivoDiferencia === "" && Number(montoCierre) !== 0 && (
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
                )}
                <button
                  onClick={cerrarCaja}
                  disabled={cerrandoCaja}
                  className="btn-secondary w-full"
                >
                  {cerrandoCaja ? "Cerrando..." : "Cerrar caja"}
                </button>
                <button
                  onClick={() => setOpenCajaModal(false)}
                  className="btn-outline w-full"
                >
                  Cancelar
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

      {showMovimiento && caja && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Retiro / Ingreso de caja
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMovTipo("ingreso")}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition ${
                    movTipo === "ingreso"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  Ingreso
                </button>
                <button
                  onClick={() => setMovTipo("retiro")}
                  className={`p-3 rounded-lg border-2 text-sm font-semibold transition ${
                    movTipo === "retiro"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-500"
                  }`}
                >
                  Retiro
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto (S/.)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={movMonto}
                  onChange={(e) => setMovMonto(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <input
                  className="input-field"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  placeholder="Ej. gasolina, movilidad, devolución"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowMovimiento(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button onClick={registrarMovimiento} className="btn-primary">
                  Registrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPagos && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Cobrar</h3>
              <button
                onClick={() => setShowPagos(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => pagoRapido("efectivo")}
                className="btn-outline !py-2 text-sm"
              >
                Todo en efectivo
              </button>
              <button
                onClick={() => pagoRapido("yape")}
                className="btn-outline !py-2 text-sm"
              >
                Todo en Yape
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {pagos.map((p, i) => {
                const metodo = METODOS.find((m) => m.id === p.metodo);
                const Icon = metodo?.icon ?? Banknote;
                return (
                  <div key={`${p.metodo}-${i}`} className="flex items-center gap-2">
                    <span className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-gray-600" />
                    </span>
                    <span className="w-20 text-sm font-medium">{metodo?.label}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        S/
                      </span>
                      <input
                        type="number"
                        className="input-field !py-2 pl-9"
                        value={p.monto}
                        onChange={(e) => actualizarPago(i, e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {pagos.length > 1 && (
                      <button
                        onClick={() => quitarPago(i)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={agregarMetodoPago}
              className="text-sm font-semibold text-primary-600 hover:underline mb-4"
            >
              + Agregar otro método de pago
            </button>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Total</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Suma de pagos</span>
                <span className="font-semibold">{formatCurrency(sumaPagos)}</span>
              </div>
              <div
                className={`flex justify-between font-bold ${
                  Math.abs(faltaPago) < 0.001
                    ? "text-green-600"
                    : "text-amber-600"
                }`}
              >
                <span>{faltaPago > 0 ? "Falta" : faltaPago < 0 ? "Excede" : "Completo"}</span>
                <span>{formatCurrency(Math.abs(faltaPago))}</span>
              </div>
            </div>

            <button
              onClick={cobrar}
              disabled={processing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition ${
                Math.abs(faltaPago) < 0.001
                  ? "bg-primary-600 hover:bg-primary-700 text-white"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {processing ? "Procesando..." : "Confirmar venta"}
            </button>
          </div>
        </div>
      )}

      {showExito && ventaCreada && (
        <>
          <div id="receipt-print" className="receipt-print" aria-hidden="true">
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15 }}>
              FILAM
            </div>
            <div style={{ textAlign: "center" }}>Tuberías PVC & Ferretería</div>
            <div style={{ textAlign: "center", margin: "8px 0" }}>
              NOTA DE VENTA
            </div>
            <div>Venta: #{ventaCreada.id.slice(0, 8).toUpperCase()}</div>
            <div>
              {ventaCreada.creado_en
                ? new Date(ventaCreada.creado_en).toLocaleString("es-PE")
                : "Fecha no disponible"}
            </div>
            <hr style={{ margin: "8px 0", borderColor: "#94a3b8" }} />
            {ventaCreada.items.map((item, i) => (
              <div key={i} style={{ marginBottom: 5 }}>
                <div>{item.producto.nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    {item.cantidad} x {formatCurrency(item.precio_unitario)}
                  </span>
                  <span>
                    {formatCurrency(item.precio_unitario * item.cantidad)}
                  </span>
                </div>
              </div>
            ))}
            <hr style={{ margin: "8px 0", borderColor: "#94a3b8" }} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <span>TOTAL</span>
              <span>{formatCurrency(ventaCreada.total)}</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              Gracias por su compra
            </div>
          </div>

          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Check size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Venta registrada
                </h3>
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
        </>
      )}
    </div>
  );
}
