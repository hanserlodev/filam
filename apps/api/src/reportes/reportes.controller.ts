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
          where: { creado_en: { gte: hoy }, anulada: false },
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
      where: { creado_en: { gte: desde }, anulada: false },
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
      where: { venta: { anulada: false } },
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

  /**
   * Descuentos (regateos) por cajero: total rebajado y cantidad de ventas con descuento.
   */
  @Get("descuentos")
  async descuentosPorCajero(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    const ventas = await this.prisma.venta.findMany({
      where: { creado_en: { gte: desde }, anulada: false, descuento_monto: { gt: 0 } },
      select: {
        descuento_monto: true,
        vendedor: { select: { nombre: true } },
      },
    });

    const porCajero = new Map<
      string,
      { cajero: string; total_descuento: Prisma.Decimal; cantidad: number }
    >();
    for (const v of ventas) {
      const nombre = v.vendedor?.nombre || "Desconocido";
      const entry = porCajero.get(nombre) || {
        cajero: nombre,
        total_descuento: new Prisma.Decimal(0),
        cantidad: 0,
      };
      entry.total_descuento = entry.total_descuento.plus(toDecimal(v.descuento_monto));
      entry.cantidad += 1;
      porCajero.set(nombre, entry);
    }

    return Array.from(porCajero.values()).map((e) => ({
      cajero: e.cajero,
      total_descuento: toMoney(e.total_descuento).toNumber(),
      cantidad: e.cantidad,
    }));
  }

  /**
   * Ventas por debajo del costo (se vendió perdiendo margen).
   */
  @Get("bajo-costo")
  async ventasBajoCosto(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    return this.prisma.venta.findMany({
      where: { creado_en: { gte: desde }, anulada: false, venta_bajo_costo: true },
      select: {
        id: true,
        total: true,
        subtotal: true,
        descuento_monto: true,
        motivo_descuento: true,
        creado_en: true,
        vendedor: { select: { nombre: true } },
      },
      orderBy: { creado_en: "desc" },
    });
  }

  /**
   * Ajustes y mermas de inventario.
   */
  @Get("ajustes-inventario")
  async ajustesInventario(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    const movimientos = await this.prisma.inventarioMovimiento.findMany({
      where: {
        creado_en: { gte: desde },
        tipo: { in: ["merma", "rotura", "perdida", "ajuste_conteo", "devolucion_proveedor"] },
      },
      include: {
        producto: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { creado_en: "desc" },
    });

    return movimientos.map((m) => ({
      id: m.id,
      producto: m.producto.nombre,
      tipo: m.tipo,
      cantidad: m.cantidad.toNumber(),
      stock_anterior: m.stock_anterior.toNumber(),
      stock_posterior: m.stock_posterior.toNumber(),
      motivo: m.motivo,
      usuario: m.usuario.nombre,
      creado_en: m.creado_en,
    }));
  }

  /**
   * Anulaciones (ventas y compras).
   */
  @Get("anulaciones")
  async anulaciones(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    const [ventasAnuladas, comprasAnuladas] = await Promise.all([
      this.prisma.venta.findMany({
        where: { anulada_en: { gte: desde }, anulada: true },
        select: {
          id: true,
          total: true,
          motivo_anulacion: true,
          anulada_en: true,
          vendedor: { select: { nombre: true } },
          anulada_por: { select: { nombre: true } },
        },
        orderBy: { anulada_en: "desc" },
      }),
      this.prisma.compra.findMany({
        where: { anulada_en: { gte: desde }, estado: { not: "registrada" } },
        select: {
          id: true,
          total: true,
          motivo_anulacion: true,
          anulada_en: true,
          proveedor_nombre: true,
          anulada_por: { select: { nombre: true } },
        },
        orderBy: { anulada_en: "desc" },
      }),
    ]);

    return {
      ventas: ventasAnuladas.map((v) => ({
        id: v.id,
        total: v.total.toNumber(),
        motivo: v.motivo_anulacion,
        fecha: v.anulada_en,
        vendedor: v.vendedor?.nombre,
        anulada_por: v.anulada_por?.nombre,
      })),
      compras: comprasAnuladas.map((c) => ({
        id: c.id,
        total: c.total.toNumber(),
        proveedor: c.proveedor_nombre,
        motivo: c.motivo_anulacion,
        fecha: c.anulada_en,
        anulada_por: c.anulada_por?.nombre,
      })),
    };
  }

  /**
   * Margen bruto del período (ventas - costo de lo vendido).
   */
  @Get("margen")
  async margen(@Query("dias") dias?: string) {
    const nDias = Math.min(Math.max(Number(dias) || 7, 1), 90);
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - (nDias - 1));

    const items = await this.prisma.ventaItem.findMany({
      where: { venta: { creado_en: { gte: desde }, anulada: false } },
      select: {
        cantidad: true,
        precio_unitario: true,
        costo_unitario: true,
      },
    });

    let ventas = new Prisma.Decimal(0);
    let costo = new Prisma.Decimal(0);
    for (const item of items) {
      ventas = ventas.plus(toDecimal(item.precio_unitario).mul(toDecimal(item.cantidad)));
      if (item.costo_unitario != null) {
        costo = costo.plus(toDecimal(item.costo_unitario).mul(toDecimal(item.cantidad)));
      }
    }

    return {
      ventas: toMoney(ventas).toNumber(),
      costo_vendido: toMoney(costo).toNumber(),
      margen_bruto: toMoney(ventas.minus(costo)).toNumber(),
    };
  }
}
