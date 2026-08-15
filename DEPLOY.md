# Despliegue — FILAM POS

Demo en la nube (gratis):
- **Frontend**: Vercel (Next.js)
- **Backend**: Render (NestJS)
- **BD + Auth**: Supabase (cloud, ya configurado)

Producción futura: self-hosted (Caddy + Docker Compose).

## Requisitos previos
- Repo en GitHub (sube el código: `git init && git add . && git commit -m "init"`)
- Cuentas en Vercel y Render
- Proyecto Supabase ya configurado (migraciones y seed aplicados)

## 1. Backend — Render

1. New → **Web Service** → conectar repo GitHub
2. Configurar:
   - **Name**: `filam-api`
   - **Runtime**: Node
   - **Build Command**: `npm ci --include=dev && npx prisma generate --schema=apps/api/prisma/schema.prisma && npm run build --workspace @filam/api`
   - **Pre-Deploy Command**: `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`
   - **Start Command**: `node apps/api/dist/src/main.js`
   - **Health Check Path**: `/api/health`
   - **Plan**: Free
3. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://postgres.tdcfyggnlqsszzmnscov:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.tdcfyggnlqsszzmnscov:<PASSWORD>@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   GOTRUE_URL=https://tdcfyggnlqsszzmnscov.supabase.co/auth/v1
   SERVICE_ROLE_KEY=<service_role key>
   GOTRUE_JWT_SECRET=<JWT Secret>
   CORS_ORIGIN=https://<tu-dominio-vercel>.vercel.app
   PORT=10000
   NODE_ENV=production
   ```
4. Deploy. Guarda la URL (`https://filam-api.onrender.com`)

## 2. Frontend — Vercel

1. New Project → importar repo GitHub
2. **Root Directory**: `apps/web`
3. **Framework**: Next.js (auto-detectado)
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tdcfyggnlqsszzmnscov.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   NEXT_PUBLIC_API_URL=https://filam-api.onrender.com
   ```
5. Deploy. Guarda la URL (`https://filam-pos.vercel.app`)

## 3. CORS (importante)

Vuelve a Render y actualiza `CORS_ORIGIN` con la URL de Vercel:

```
CORS_ORIGIN=https://filam-pos.vercel.app
```

## 4. Supabase (ya hecho)

- Migraciones aplicadas: `init`, `configuracion`, `map_table_names`
- Seed ejecutado: 12 productos, 6 categorías, admin + cajero, caja abierta
- Usuarios creados en GoTrue (auth.users) con **contraseñas fuertes** (rotadas, nunca en texto plano en el repo). Si aún existen los usuarios demo con las contraseñas por defecto, **rotarlas de inmediato**.

## 5. Seguridad y rotación de secretos

Antes de operar en producción:
- Rotar `SERVICE_ROLE_KEY`, contraseña de BD y `GOTRUE_JWT_SECRET` desde el dashboard de Supabase.
- Actualizar las variables en Render y `.env` tras la rotación.
- **Nunca** guardar secretos en el repo, documentación, logs o terminales compartidas.
- Variable opcional `RATE_LIMIT_PER_MINUTE` (por defecto 120 peticiones/min por IP).
- CI ejecuta GitLeaks (escaneo de secretos) en cada push/PR.

## Demo (14 ago)

Flujo para la demo:
1. Login con credenciales de demo (solo entorno de desarrollo local)
2. Abrir caja (S/200) si no está abierta
3. Buscar producto (escáner o búsqueda)
4. Agregar al carrito → Cobrar (efectivo/tarjeta/yape/plin)
5. Ver stock decrementado en Productos
6. Dashboard con ventas del día
