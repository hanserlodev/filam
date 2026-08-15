import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { toDecimal } from "../common/decimal";

@Injectable()
export class PrecioHistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra el cambio de costo/precio de un producto en el historial.
   * Solo escribe cuando el valor cambia.
   */
  async registrar(
    productoId: string,
    {
      costoAnterior,
      costoNuevo,
      precioAnterior,
      precioNuevo,
      origen,
      usuarioId,
    }: {
      costoAnterior: Prisma.Decimal | number | string | null;
      costoNuevo: Prisma.Decimal | number | string | null;
      precioAnterior: Prisma.Decimal | number | string | null;
      precioNuevo: Prisma.Decimal | number | string | null;
      origen: string;
      usuarioId: string;
    }
  ) {
    const costoCambio =
      costoAnterior != null &&
      costoNuevo != null &&
      !toDecimal(costoAnterior).eq(toDecimal(costoNuevo));
    const precioCambio =
      precioAnterior != null &&
      precioNuevo != null &&
      !toDecimal(precioAnterior).eq(toDecimal(precioNuevo));

    if (!costoCambio && !precioCambio) return;

    return this.prisma.precioHistorico.create({
      data: {
        producto_id: productoId,
        costo_anterior: costoAnterior != null ? toDecimal(costoAnterior) : null,
        costo_nuevo: costoNuevo != null ? toDecimal(costoNuevo) : null,
        precio_anterior: precioAnterior != null ? toDecimal(precioAnterior) : null,
        precio_nuevo: precioNuevo != null ? toDecimal(precioNuevo) : null,
        origen,
        usuario_id: usuarioId,
      },
    });
  }

  /**
   * Calcula el costo promedio ponderado de un producto (siempre basado en compras).
   */
  async costoPromedio(productoId: string): Promise<number | null> {
    const agrupado = await this.prisma.compraItem.groupBy({
      by: ["producto_id"],
      where: {
        producto_id: productoId,
        compra: { estado: { not: "anulada" } },
      },
      _sum: { cantidad: true },
    });
    if (!agrupado.length) return null;

    // No hay una suma ponderada directa simple sin traer filas; consultamos las compras.
    const items = await this.prisma.compraItem.findMany({
      where: {
        producto_id: productoId,
        compra: { estado: { not: "anulada" } },
      },
      select: { cantidad: true, costo_unitario: true },
    });
    if (!items.length) return null;

    let totalCosto = toDecimal(0);
    let totalCantidad = toDecimal(0);
    for (const item of items) {
      totalCosto = totalCosto.plus(
        toDecimal(item.costo_unitario).mul(toDecimal(item.cantidad))
      );
      totalCantidad = totalCantidad.plus(toDecimal(item.cantidad));
    }
    if (totalCantidad.isZero()) return null;
    return totalCosto.div(totalCantidad).toNumber();
  }
}
