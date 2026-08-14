import { Controller, Get, Query } from "@nestjs/common";
import { RolUsuario } from "@prisma/client";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { toDecimal, toMoney } from "../common/decimal";

@Controller("reportes")
@Roles(RolUsuario.administrador)
export class ReportesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("resumen")
  async resumen() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const [ventasHoy, ventasTotales, productos, productosBajos, clientes] =
      await Promise.all([
        this.prisma.venta.findMany({
          where: { creado_en: { gte: hoy } },
          select: { total: true, metodo_pago: true },
        }),
        this.prisma.venta.count(),
        this.prisma.producto.count(),
        this.prisma.producto.count({
          where: { activo: true, stock: { lte: this.prisma.producto.fields.stock_minimo } },
        }),
        this.prisma.cliente.count(),
      ]);

    return {
      ventas_hoy: toMoney(
        ventasHoy.reduce(
          (sum, venta) => sum.plus(toDecimal(venta.total)),
          new Prisma.Decimal(0)
        )
      ).toNumber(),
      cantidad_ventas_hoy: ventasHoy.length,
      ventas_por_metodo_hoy: ventasHoy.reduce(
        (acc, v) => {
          acc[v.metodo_pago] = toMoney(
            new Prisma.Decimal(acc[v.metodo_pago] || 0).plus(toDecimal(v.total))
          ).toNumber();
          return acc;
        },
        {} as Record<string, number>
      ),
      total_ventas_historicas: ventasTotales,
      total_productos: productos,
      productos_stock_bajo: productosBajos,
      total_clientes: clientes,
    };
  }

  @Get("ventas-por-dia")
  async ventasPorDia(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    const ventas = await this.prisma.venta.findMany({
      where: { creado_en: { gte: desde } },
      select: { total: true, creado_en: true },
      orderBy: { creado_en: "asc" },
    });

    const mapa = new Map<string, { total: Prisma.Decimal; cantidad: number }>();
    for (let i = 0; i < nDias; i++) {
      const d = new Date(desde);
      d.setDate(desde.getDate() + i);
      mapa.set(d.toISOString().slice(0, 10), {
        total: new Prisma.Decimal(0),
        cantidad: 0,
      });
    }

    for (const v of ventas) {
      const key = new Date(v.creado_en).toISOString().slice(0, 10);
      const entry = mapa.get(key);
      if (entry) {
        entry.total = entry.total.plus(toDecimal(v.total));
        entry.cantidad += 1;
      }
    }

    return Array.from(mapa.entries()).map(([fecha, { total, cantidad }]) => ({
      fecha,
      total: toMoney(total).toNumber(),
      cantidad,
    }));
  }

  @Get("top-productos")
  async topProductos(@Query("limite") limite?: string) {
    const limit = Math.min(Math.max(Number(limite) || 10, 1), 50);
    const agrupados = await this.prisma.ventaItem.groupBy({
      by: ["producto_id"],
      _sum: { cantidad: true },
      _count: true,
      orderBy: { _sum: { cantidad: "desc" } },
      take: limit,
    });

    const ids = agrupados.map((a) => a.producto_id);
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, precio: true },
    });
    const prodMap = new Map(productos.map((p) => [p.id, p]));

    return agrupados.map((a) => {
      const prod = prodMap.get(a.producto_id);
      return {
        producto_id: a.producto_id,
        nombre: prod?.nombre || "Desconocido",
        cantidad_vendida: a._sum.cantidad,
        veces_vendido: a._count,
        ingreso_estimado: toMoney(
          toDecimal(prod?.precio || 0).mul(toDecimal(a._sum.cantidad || 0))
        ).toNumber(),
      };
    });
  }

  @Get("stock-bajo")
  async stockBajo() {
    return this.prisma.producto.findMany({
      where: { activo: true, stock: { lte: this.prisma.producto.fields.stock_minimo } },
      include: { categoria: true },
      orderBy: { stock: "asc" },
    });
  }
}
