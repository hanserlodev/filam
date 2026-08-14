-- El frontend usa exclusivamente la API NestJS; Supabase REST no debe
-- exponer directamente los datos operativos.
DO $$
DECLARE
  tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'usuarios',
    'categorias',
    'productos',
    'caja_sesiones',
    'clientes',
    'ventas',
    'venta_items',
    'compras',
    'compra_items',
    'configuracion'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tabla);
  END LOOP;
END $$;
