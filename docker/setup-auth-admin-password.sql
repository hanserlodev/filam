-- Requerido tras inicializar supabase/postgres: el role supabase_auth_admin se crea sin password.
-- Debe ejecutarse como superusuario (supabase_admin) pasando la variable:
-- psql -v auth_password="$LOCAL_POSTGRES_PASSWORD" -f docker/setup-auth-admin-password.sql
ALTER ROLE supabase_auth_admin WITH PASSWORD :'auth_password';
