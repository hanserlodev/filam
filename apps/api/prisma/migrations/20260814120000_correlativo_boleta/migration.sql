-- Correlativo de boleta/factura (serie + número secuencial).
ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "serie" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "numero_correlativo" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "ventas_serie_numero_correlativo_key"
  ON "ventas"("serie", "numero_correlativo")
  WHERE "serie" IS NOT NULL;
