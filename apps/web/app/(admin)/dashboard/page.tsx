"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency } from "@/lib/utils";

interface Venta {
  id: string;
  total: number;
  creado_en: string;
  metodo_pago: string;
}

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
  activo: boolean;
}

interface Caja {
  id: string;
  estado: string;
  monto_apertura: number;
  _count?: { ventas: number };
}

export default function DashboardPage() {
  const { token } = useAccessToken();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<Venta[]>("/ventas", token),
      api.get<Producto[]>("/productos", token),
      api.get<Caja | null>("/caja/abierta", token),
    ])
      .then(([v, p, c]) => {
        setVentas(v);
        setProductos(p.filter((item) => item.activo !== false));
        setCaja(c);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  const hoy = useMemo(() => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    const delDia = ventas.filter((v) => new Date(v.creado_en) >= inicio);
    return {
      total: delDia.reduce((s, v) => s + Number(v.total), 0),
      cantidad: delDia.length,
    };
  }, [ventas]);

  const stockBajo = useMemo(
    () =>
      productos.filter((p) => p.activo !== false && p.stock <= p.stock_minimo)
        .length,
    [productos]
  );

  const stats = [
    {
      label: "Ventas de hoy",
      value: formatCurrency(hoy.total),
      icon: TrendingUp,
      color: "text-primary-600 bg-primary-50",
    },
    {
      label: "Ventas registradas",
      value: String(hoy.cantidad),
      icon: Wallet,
      color: "text-secondary-600 bg-secondary-50",
    },
    {
      label: "Productos activos",
      value: String(
        productos.filter((p) => p.activo !== false).length
      ),
      icon: Package,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Stock bajo",
      value: String(stockBajo),
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Resumen de tu jornada</p>
        </div>
        <Link
          href="/pos"
          className="btn-primary flex items-center space-x-2 !py-3 !px-6"
        >
          <ShoppingCart size={20} />
          <span>Ir al POS</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
        </div>
      )}

      {caja ? (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>
            Caja abierta — apertura de {formatCurrency(caja.monto_apertura)} ·{" "}
            {caja._count?.ventas ?? 0} ventas
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4">
          No hay caja abierta. Abre una caja en el POS para poder vender.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {s.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}
                >
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
