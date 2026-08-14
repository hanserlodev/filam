"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Trophy, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";
import { formatCurrency } from "@/lib/utils";

interface VentaDia {
  fecha: string;
  total: number;
  cantidad: number;
}

interface TopProducto {
  producto_id: string;
  nombre: string;
  cantidad_vendida: number;
  veces_vendido: number;
  ingreso_estimado: number;
}

interface StockBajo {
  id: string;
  nombre: string;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
  categoria: { nombre: string } | null;
}

export default function ReportesPage() {
  const { token } = useAccessToken();
  const [ventasPorDia, setVentasPorDia] = useState<VentaDia[]>([]);
  const [topProductos, setTopProductos] = useState<TopProducto[]>([]);
  const [stockBajo, setStockBajo] = useState<StockBajo[]>([]);
  const [dias, setDias] = useState(7);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.get<VentaDia[]>(`/reportes/ventas-por-dia?dias=${dias}`, token),
      api.get<TopProducto[]>("/reportes/top-productos?limite=10", token),
      api.get<StockBajo[]>("/reportes/stock-bajo", token),
    ])
      .then(([v, t, s]) => {
        setVentasPorDia(v);
        setTopProductos(t);
        setStockBajo(s);
      })
      .catch((e) => setError(e.message));
  }, [token, dias]);

  const maxTotal = Math.max(...ventasPorDia.map((v) => v.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500">Análisis de ventas y stock</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {/* Ventas por día */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp size={20} className="text-primary-600" />
            <h2 className="font-bold text-gray-900">Ventas por día</h2>
          </div>
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimos 15 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
        </div>
        <div className="flex items-end h-40 gap-1">
          {ventasPorDia.map((v) => (
            <div
              key={v.fecha}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${v.fecha}: ${formatCurrency(v.total)} (${v.cantidad} ventas)`}
            >
              <div
                className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-all"
                style={{ height: `${Math.max((v.total / maxTotal) * 100, 2)}%` }}
              />
              <span className="text-[10px] text-gray-400">
                {new Date(v.fecha + "T12:00:00").toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          ))}
          {ventasPorDia.length === 0 && (
            <div className="w-full text-center text-gray-400">Sin ventas en el período</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top productos */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
            <Trophy size={20} className="text-secondary-600" />
            <h2 className="font-bold text-gray-900">Top productos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topProductos.map((p, i) => (
              <div key={p.producto_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0
                        ? "bg-secondary-100 text-secondary-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                    <p className="text-xs text-gray-400">
                      {p.cantidad_vendida} vendidos · {p.veces_vendido} ventas
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900 text-sm">
                  {formatCurrency(p.ingreso_estimado)}
                </span>
              </div>
            ))}
            {topProductos.length === 0 && (
              <div className="p-8 text-center text-gray-400">Sin ventas aún</div>
            )}
          </div>
        </div>

        {/* Stock bajo */}
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center space-x-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h2 className="font-bold text-gray-900">Stock bajo</h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
            {stockBajo.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{p.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {p.categoria?.nombre || "—"} · mínimo {p.stock_minimo}
                  </p>
                </div>
                <span
                  className={`font-bold text-sm ${
                    p.stock === 0 ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {p.stock} {p.unidad_medida}
                </span>
              </div>
            ))}
            {stockBajo.length === 0 && (
              <div className="p-8 text-center text-gray-400">Sin productos con stock bajo</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}