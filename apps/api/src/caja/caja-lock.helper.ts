import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Serializa operaciones concurrentes sobre una misma caja con un advisory
 * lock de PostgreSQL (pg_advisory_xact_lock), liberado al terminar la
 * transacción.
 *
 * A diferencia de SELECT ... FOR UPDATE sobre la fila, el advisory lock
 * cubre TODA la transacción (lecturas de movimientos/ventas incluidas), lo
 * que impide que dos retiros concurrentes lean el mismo efectivo disponible
 * y sobregiren la caja (AUDITORIA.md F1.2 / F1.3).
 */
export async function bloquearCaja(
  tx: Tx,
  cajaId: string
): Promise<void> {
  // hashtext genera el mismo valor para el mismo id en todas las conexiones.
  // El cast ::text evita que Prisma falle al deserializar columnas 'void'.
  await tx.$queryRaw<unknown[]>(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${cajaId}))::text`
  );
}
