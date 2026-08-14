-- Agrega campos de contacto (email, web, instagram)
ALTER TABLE "configuracion" ADD COLUMN IF NOT EXISTS "email" VARCHAR(100);
ALTER TABLE "configuracion" ADD COLUMN IF NOT EXISTS "web" VARCHAR(150);
ALTER TABLE "configuracion" ADD COLUMN IF NOT EXISTS "instagram" VARCHAR(100);