-- Hardening RLS: tablas operativas nuevas sin protección directa.
-- AUDITORIA.md F0.4 / F2.1 — cierra el acceso REST/PostgREST a anon y authenticated.

DO $$
DECLARE
  tabla text;
BEGIN
  -- Tablas creadas después de la migración RLS inicial que quedaron sin protección.
  FOREACH tabla IN ARRAY ARRAY[
    'venta_pagos',
    'caja_movimientos',
    'caja_evidencias',
    'inventario_movimientos',
    'precios_historico'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tabla);
  END LOOP;

  -- Cierre adicional para tablas creadas por Prisma/Postgres internas y cualquier
  -- tabla operativa que pueda agregarse. Protege también _prisma_migrations.
  FOREACH tabla IN ARRAY ARRAY[
    '_prisma_migrations'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tabla);
  END LOOP;
END $$;
