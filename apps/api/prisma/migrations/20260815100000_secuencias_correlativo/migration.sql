-- Secuencias para correlativos de boleta/factura (AUDITORIA.md F1.4).
-- nextval() es atómico en PostgreSQL: elimina la carrera de MAX+1 lógico
-- y garantiza números secuenciales sin duplicados incluso con concurrencia.
-- Nombres en minúsculas para evitar problemas de citado en nextval('...').

-- Serie B001 (boletas).
CREATE SEQUENCE IF NOT EXISTS correlativo_b001 START 1;
-- Serie F001 (facturas).
CREATE SEQUENCE IF NOT EXISTS correlativo_f001 START 1;

-- Sincroniza con el máximo correlativo ya registrado (no rompe datos existentes).
DO $$
DECLARE
  max_b integer;
  max_f integer;
BEGIN
  SELECT COALESCE(MAX(numero_correlativo), 0) INTO max_b
    FROM ventas WHERE serie = 'B001';
  PERFORM setval('correlativo_b001', GREATEST(max_b, 1), max_b > 0);

  SELECT COALESCE(MAX(numero_correlativo), 0) INTO max_f
    FROM ventas WHERE serie = 'F001';
  PERFORM setval('correlativo_f001', GREATEST(max_f, 1), max_f > 0);
END $$;
