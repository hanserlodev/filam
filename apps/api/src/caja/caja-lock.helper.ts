import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Bloquea la fila de una sesión de caja con `SELECT ... FOR UPDATE`.
 *
 * Serializa operaciones concurrentes sobre la misma caja (ventas, retiros,
 * cierre) para evitar: retiros que sobregiran el efectivo, ventas que se
 * registran durante un cierre, o doble cierre (AUDITORIA.md F1.2 / F1.3).
 */
export async function bloquearCaja(
  tx: Tx,
  cajaId: string
): Promise<void> {
  const filas = await tx.$queryRaw<
    Array<{ id: string; estado: string }>
  >(Prisma.sql`SELECT id, estado FROM caja_sesiones WHERE id = ${cajaId} FOR UPDATE`);
  if (filas.length === 0) {
    throw new Error("Sesión de caja no encontrada");
  }
}
