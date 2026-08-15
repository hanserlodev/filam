import { Prisma, TipoMovimientoInventario } from "@prisma/client";
import { toDecimal } from "../common/decimal";

type Tx = Prisma.TransactionClient;

interface RegistrarMovimientoArgs {
  tx: Tx;
  productoId: string;
  tipo: TipoMovimientoInventario;
  cantidad: number; // positiva (entra) o negativa (sale)
  motivo: string;
  usuarioId: string;
  compraId?: string;
  ventaId?: string;
}

/**
 * Aplica una variación de stock y registra el movimiento de inventario
 * con stock anterior/posterior para auditoría. El stock nunca puede quedar negativo.
 */
export async function registrarMovimientoInventario({
  tx,
  productoId,
  tipo,
  cantidad,
  motivo,
  usuarioId,
  compraId,
  ventaId,
}: RegistrarMovimientoArgs) {
  const variacion = toDecimal(cantidad);

  const producto = await tx.producto.findUnique({
    where: { id: productoId },
    select: { stock: true },
  });
  if (!producto) {
    throw new Error("Producto no encontrado");
  }

  const stockAnterior = toDecimal(producto.stock);
  const stockPosterior = stockAnterior.plus(variacion);
  if (stockPosterior.lt(0)) {
    throw new Error(
      `Stock insuficiente: disponible ${stockAnterior}, se intentó variar ${variacion}`
    );
  }

  await tx.producto.update({
    where: { id: productoId },
    data: { stock: stockPosterior },
  });

  return tx.inventarioMovimiento.create({
    data: {
      producto_id: productoId,
      tipo,
      cantidad: variacion,
      stock_anterior: stockAnterior,
      stock_posterior: stockPosterior,
      motivo,
      usuario_id: usuarioId,
      compra_id: compraId,
      venta_id: ventaId,
    },
  });
}
