-- Auditoría de caja: pagos mixtos, movimientos, anulaciones, desglose de cierre y evidencias.

-- 1. Enum de movimientos de caja
DO $$ BEGIN
  CREATE TYPE "TipoMovimientoCaja" AS ENUM ('ingreso', 'retiro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Campos de anulación en ventas
ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "anulada" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "anulada_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "anulada_por_id" TEXT,
  ADD COLUMN IF NOT EXISTS "motivo_anulacion" VARCHAR(300);

ALTER TABLE "ventas"
  ADD CONSTRAINT "ventas_anulada_por_id_fkey"
    FOREIGN KEY ("anulada_por_id") REFERENCES "usuarios"("id")
    ON UPDATE CASCADE ON DELETE SET NULL;

-- 3. Desglose de cierre en caja_sesiones
ALTER TABLE "caja_sesiones"
  ADD COLUMN IF NOT EXISTS "total_efectivo" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "total_digital" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "total_ingresos" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "total_retiros" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "monto_esperado" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "motivo_diferencia" VARCHAR(300);

-- 4. Umbral de diferencia configurable
ALTER TABLE "configuracion"
  ADD COLUMN IF NOT EXISTS "umbral_diferencia" DECIMAL(10,2) NOT NULL DEFAULT 10;

-- 5. Tabla venta_pagos
CREATE TABLE IF NOT EXISTS "venta_pagos" (
  "id" TEXT NOT NULL,
  "venta_id" TEXT NOT NULL,
  "metodo_pago" "MetodoPago" NOT NULL,
  "monto" DECIMAL(10,2) NOT NULL,
  "referencia" VARCHAR(100),
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "venta_pagos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "venta_pagos_venta_id_idx" ON "venta_pagos"("venta_id");

ALTER TABLE "venta_pagos"
  ADD CONSTRAINT "venta_pagos_venta_id_fkey"
    FOREIGN KEY ("venta_id") REFERENCES "ventas"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "venta_pagos"
  ADD CONSTRAINT "venta_pagos_monto_positive" CHECK ("monto" > 0);

-- 6. Tabla caja_movimientos
CREATE TABLE IF NOT EXISTS "caja_movimientos" (
  "id" TEXT NOT NULL,
  "caja_sesion_id" TEXT NOT NULL,
  "tipo" "TipoMovimientoCaja" NOT NULL,
  "monto" DECIMAL(10,2) NOT NULL,
  "motivo" VARCHAR(300) NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caja_movimientos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "caja_movimientos_caja_sesion_id_idx" ON "caja_movimientos"("caja_sesion_id");

ALTER TABLE "caja_movimientos"
  ADD CONSTRAINT "caja_movimientos_caja_sesion_id_fkey"
    FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesiones"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "caja_movimientos"
  ADD CONSTRAINT "caja_movimientos_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "caja_movimientos"
  ADD CONSTRAINT "caja_movimientos_monto_positive" CHECK ("monto" > 0);

-- 7. Tabla caja_evidencias
CREATE TABLE IF NOT EXISTS "caja_evidencias" (
  "id" TEXT NOT NULL,
  "caja_sesion_id" TEXT NOT NULL,
  "ruta_archivo" VARCHAR(300) NOT NULL,
  "tipo_archivo" VARCHAR(50),
  "tamano_bytes" INTEGER,
  "subida_por_id" TEXT NOT NULL,
  "reemplaza_id" TEXT,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "caja_evidencias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "caja_evidencias_caja_sesion_id_idx" ON "caja_evidencias"("caja_sesion_id");

ALTER TABLE "caja_evidencias"
  ADD CONSTRAINT "caja_evidencias_caja_sesion_id_fkey"
    FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesiones"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "caja_evidencias"
  ADD CONSTRAINT "caja_evidencias_subida_por_id_fkey"
    FOREIGN KEY ("subida_por_id") REFERENCES "usuarios"("id")
    ON UPDATE CASCADE ON DELETE RESTRICT;
