"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Wallet, Package, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency } from "@/lib/utils";

interface Resumen {
  ventas_hoy: number;
  cantidad_ventas_hoy: number;
  ventas_por_metodo_hoy: Record<string, number>;
  total_ventas_historicas: number;
  total_productos: number;
  productos_stock_bajo: number;
  total_clientes: number;
}

export default function DashboardPage() {
  const { token } = useAccessToken();
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    api
      .get<Resumen>("/reportes/resumen", token)
      .then(setResumen)
      .catch((e) => setError(e.message));
  }, [token]);

  const stats = [
    {
      label: "Ventas hoy",
      value: resumen ? formatCurrency(resumen.ventas_hoy) : "—",
      icon: TrendingUp,
      color: "text-primary-600 bg-primary-50",
    },
    {
      label: "Ventas de hoy",
      value: resumen ? `S/. ${resumen.cantidad_ventas_hoy}` : "—",
      icon: Wallet,
      color: "text-secondary-600 bg-secondary-50",
    },
    {
      label: "Productos activos",
      value: resumen?.total_productos?.toString() ?? "—",
      icon: Package,
      color: "text-green-600 bg-green-50",
    },
    {
      label: "Stock bajo",
      value: resumen?.productos_stock_bajo?.toString() ?? "—",
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Resumen general del negocio</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
          {error}
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