-- Idempotencia robusta (AUDITORIA.md F1.5).
-- Guarda un hash del payload para detectar reutilización de la clave
-- con un contenido distinto. El índice único ya impide duplicados.

ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "idempotency_hash" VARCHAR(64);
