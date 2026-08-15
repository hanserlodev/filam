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

  // Update atómico condicional: solo decrementa si hay stock suficiente.
  // Evita la carrera de lecturas simultáneas (AUDITORIA.md F1.1).
  const esEntrada = variacion.gte(0);
  const resultado = await tx.producto.updateMany({
    where: {
      id: productoId,
      ...(esEntrada ? {} : { stock: { gte: variacion.negated() } }),
    },
    data: { stock: { increment: variacion } },
  });
  if (resultado.count === 0) {
    const producto = await tx.producto.findUnique({
      where: { id: productoId },
      select: { stock: true },
    });
    if (!producto) {
      throw new Error("Producto no encontrado");
    }
    throw new Error(
      `Stock insuficiente: disponible ${producto.stock}, se intentó variar ${cantidad}`
    );
  }

  const productoPost = await tx.producto.findUnique({
    where: { id: productoId },
    select: { stock: true },
  });
  const stockPosterior = toDecimal(productoPost?.stock ?? 0);
  const stockAnterior = stockPosterior.minus(variacion);

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
