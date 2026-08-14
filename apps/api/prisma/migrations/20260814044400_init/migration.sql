-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('cajero', 'administrador');

-- CreateEnum
CREATE TYPE "UnidadMedida" AS ENUM ('unidad', 'kg', 'metro', 'litro', 'caja');

-- CreateEnum
CREATE TYPE "EstadoCaja" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoComprobante" AS ENUM ('nota_venta', 'boleta', 'factura');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('efectivo', 'tarjeta', 'transferencia', 'yape', 'plin');

-- CreateEnum
CREATE TYPE "FormatoImpresion" AS ENUM ('termica', 'a4', 'boleta_propia');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'cajero',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "categoria_id" TEXT,
    "nombre" VARCHAR(200) NOT NULL,
    "codigo_barras" VARCHAR(50),
    "sku" VARCHAR(50),
    "precio" DECIMAL(10,2) NOT NULL,
    "costo" DECIMAL(10,2),
    "stock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unidad_medida" "UnidadMedida" NOT NULL DEFAULT 'unidad',
    "stock_minimo" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "imagen_url" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caja_sesiones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "monto_apertura" DECIMAL(10,2) NOT NULL,
    "monto_cierre" DECIMAL(10,2),
    "diferencia" DECIMAL(10,2),
    "abierta_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrada_en" TIMESTAMPTZ(6),
    "estado" "EstadoCaja" NOT NULL DEFAULT 'abierta',

    CONSTRAINT "caja_sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(150),
    "dni_ruc" VARCHAR(20),
    "telefono" VARCHAR(20),
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "caja_sesion_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "vendedor_id" TEXT NOT NULL,
    "tipo_comprobante" "TipoComprobante" NOT NULL DEFAULT 'nota_venta',
    "metodo_pago" "MetodoPago" NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "comprobante_ref" TEXT,
    "formato_impresion" "FormatoImpresion" NOT NULL DEFAULT 'termica',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" TEXT NOT NULL,
    "venta_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "proveedor_nombre" VARCHAR(150),
    "usuario_id" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_items" (
    "id" TEXT NOT NULL,
    "compra_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "costo_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_barras_key" ON "productos"("codigo_barras");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE INDEX "productos_categoria_id_idx" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "productos_codigo_barras_idx" ON "productos"("codigo_barras");

-- CreateIndex
CREATE INDEX "caja_sesiones_usuario_id_idx" ON "caja_sesiones"("usuario_id");

-- CreateIndex
CREATE INDEX "ventas_caja_sesion_id_idx" ON "ventas"("caja_sesion_id");

-- CreateIndex
CREATE INDEX "ventas_creado_en_idx" ON "ventas"("creado_en");

-- CreateIndex
CREATE INDEX "venta_items_venta_id_idx" ON "venta_items"("venta_id");

-- CreateIndex
CREATE INDEX "compra_items_compra_id_idx" ON "compra_items"("compra_id");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_sesiones" ADD CONSTRAINT "caja_sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_caja_sesion_id_fkey" FOREIGN KEY ("caja_sesion_id") REFERENCES "caja_sesiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_venta_id_fkey" FOREIGN KEY ("venta_id") REFERENCES "ventas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_compra_id_fkey" FOREIGN KEY ("compra_id") REFERENCES "Compra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
