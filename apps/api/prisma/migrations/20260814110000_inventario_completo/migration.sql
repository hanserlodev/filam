-- Inventario completo: movimientos, historial de precios, descuentos, compras con documento.

-- 1. Enums
DO $$ BEGIN CREATE TYPE "TipoMovimientoInventario" AS ENUM ('compra','venta','anulacion_venta','devolucion_proveedor','merma','rotura','perdida','ajuste_conteo'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EstadoCompra" AS ENUM ('registrada','anulada','devuelta'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TipoDocumentoCompra" AS ENUM ('factura','boleta','guia','referencia'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Categorías: archivado y jerarquía
ALTER TABLE "categorias"
  ADD COLUMN IF NOT EXISTS "activa" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "padre_id" TEXT,
  ADD COLUMN IF NOT EXISTS "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "categorias"
  ADD CONSTRAINT "categorias_padre_id_fkey" FOREIGN KEY ("padre_id") REFERENCES "categorias"("id") ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "categorias_padre_id_idx" ON "categorias"("padre_id");

-- 3. Productos: stock objetivo
ALTER TABLE "productos"
  ADD COLUMN IF NOT EXISTS "stock_objetivo" DECIMAL(10,2);

-- 4. Ventas: descuento, subtotal, motivo, idempotency, bajo costo
ALTER TABLE "ventas"
  ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "descuento_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "motivo_descuento" VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "venta_bajo_costo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);

-- Backfill de ventas existentes.
UPDATE "ventas" SET "subtotal" = "total" WHERE "subtotal" IS NULL;
ALTER TABLE "ventas" ALTER COLUMN "subtotal" SET NOT NULL;
UPDATE "ventas" SET "descuento_monto" = 0 WHERE "descuento_monto" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "ventas_idempotency_key_key" ON "ventas"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- 5. Venta items: precio lista, descuento por ítem, costo snapshot
ALTER TABLE "venta_items"
  ADD COLUMN IF NOT EXISTS "precio_lista" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "descuento_monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "costo_unitario" DECIMAL(10,2);

-- Backfill: precio_lista de las ventas existentes usa el precio_unitario.
UPDATE "venta_items" SET "precio_lista" = "precio_unitario" WHERE "precio_lista" IS NULL;
ALTER TABLE "venta_items" ALTER COLUMN "precio_lista" SET NOT NULL;
UPDATE "venta_items" SET "descuento_monto" = 0 WHERE "descuento_monto" IS NULL;

-- 6. Compras: documento, estado, anulación
ALTER TABLE "compras"
  ADD COLUMN IF NOT EXISTS "documento_tipo" "TipoDocumentoCompra",
  ADD COLUMN IF NOT EXISTS "documento_numero" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "nota_recepcion" VARCHAR(300),
  ADD COLUMN IF NOT EXISTS "estado" "EstadoCompra" NOT NULL DEFAULT 'registrada',
  ADD COLUMN IF NOT EXISTS "anulada_en" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "anulada_por_id" TEXT,
  ADD COLUMN IF NOT EXISTS "motivo_anulacion" VARCHAR(300);

ALTER TABLE "compras"
  ADD CONSTRAINT "compras_anulada_por_id_fkey" FOREIGN KEY ("anulada_por_id") REFERENCES "usuarios"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- 7. Inventario movimientos
CREATE TABLE IF NOT EXISTS "inventario_movimientos" (
  "id" TEXT NOT NULL,
  "producto_id" TEXT NOT NULL,
  "tipo" "TipoMovimientoInventario" NOT NULL,
  "cantidad" DECIMAL(10,2) NOT NULL,
  "stock_anterior" DECIMAL(10,2) NOT NULL,
  "stock_posterior" DECIMAL(10,2) NOT NULL,
  "motivo" VARCHAR(300) NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "compra_id" TEXT,
  "venta_id" TEXT,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventario_movimientos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "inventario_movimientos_producto_id_idx" ON "inventario_movimientos"("producto_id");
CREATE INDEX IF NOT EXISTS "inventario_movimientos_usuario_id_idx" ON "inventario_movimientos"("usuario_id");

ALTER TABLE "inventario_movimientos"
  ADD CONSTRAINT "inventario_movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "inventario_movimientos"
  ADD CONSTRAINT "inventario_movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "inventario_movimientos"
  ADD CONSTRAINT "inventario_movimientos_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "compras"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "inventario_movimientos"
  ADD CONSTRAINT "inventario_movimientos_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- 8. Historial de precios/costos
CREATE TABLE IF NOT EXISTS "precios_historico" (
  "id" TEXT NOT NULL,
  "producto_id" TEXT NOT NULL,
  "costo_anterior" DECIMAL(10,2),
  "costo_nuevo" DECIMAL(10,2),
  "precio_anterior" DECIMAL(10,2),
  "precio_nuevo" DECIMAL(10,2),
  "origen" VARCHAR(50) NOT NULL,
  "usuario_id" TEXT NOT NULL,
  "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "precios_historico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "precios_historico_producto_id_idx" ON "precios_historico"("producto_id");

ALTER TABLE "precios_historico"
  ADD CONSTRAINT "precios_historico_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "precios_historico"
  ADD CONSTRAINT "precios_historico_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
