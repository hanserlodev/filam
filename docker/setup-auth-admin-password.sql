-- Requerido tras inicializar supabase/postgres: el role supabase_auth_admin se crea sin password.
-- Debe ejecutarse como superusuario (supabase_admin) con POSTGRES_PASSWORD.
ALTER ROLE supabase_auth_admin WITH PASSWORD 'filam';
