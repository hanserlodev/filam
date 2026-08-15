-- Separa monto_esperado (efectivo que cuenta el cajero) del monto operativo (incluye digital).
ALTER TABLE "caja_sesiones"
  ADD COLUMN IF NOT EXISTS "monto_operativo" DECIMAL(10,2);
