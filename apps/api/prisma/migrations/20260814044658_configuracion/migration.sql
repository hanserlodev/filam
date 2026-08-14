-- CreateTable
CREATE TABLE "configuracion" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nombre_negocio" VARCHAR(150) NOT NULL DEFAULT 'Ferretería',
    "ruc" VARCHAR(20),
    "direccion" VARCHAR(200),
    "telefono" VARCHAR(20),
    "formato_impresion" "FormatoImpresion" NOT NULL DEFAULT 'termica',
    "metodos_pago" "MetodoPago"[] DEFAULT ARRAY['efectivo']::"MetodoPago"[],
    "extras_contratados" JSONB NOT NULL DEFAULT '{}',
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);
