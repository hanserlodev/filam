# Auditoría Integral FILAM

> Auditoría de solo lectura. Fecha: 15 ago 2026.
> Estado: pendiente de remediación por fases.
> Documento operativo: avanzar las fases en orden; cada fase se completa con evidencia verificable antes de pasar a la siguiente.

## Resultado Ejecutivo

| Área | Estado | Riesgo |
|---|---|---|
| Autenticación básica | Implementada | Medio |
| Autorización backend | Parcialmente implementada | Alto |
| Integridad de inventario | Vulnerable ante concurrencia | Crítico |
| Integridad de caja | Vulnerable ante concurrencia | Crítico |
| RLS Supabase | Incompleto | Crítico |
| Secretos y operación | Riesgo alto | Crítico |
| Backups y recuperación | No verificables | Crítico |
| Rendimiento | Adecuado para baja escala | Medio |
| Protección HTTP | Insuficiente | Alto |
| Frontend | Funcional, muy expuesto a errores de sesión/red | Alto |
| Reglas de negocio | Parcialmente aplicadas | Alto |
| Tests | 103 unitarios; faltan pruebas de integración/concurrencia | Alto |

---

## FASE 0 — CONTENCIÓN INMEDIATA

- [x] 0.1 Rotar secretos — **usuarios demo rotados** (admin123/cajero123 invalidadas). PENDIENTE manual: rotar SERVICE_ROLE_KEY, DB password y GOTRUE_JWT_SECRET en dashboard de Supabase + actualizar Render/.env.
- [x] 0.2 Eliminar credenciales demo de producción y documentación (login page + DEPLOY.md).
- [x] 0.3 Cerrar puertos PostgreSQL y GoTrue en Docker (bind 127.0.0.1 + `GOTRUE_DISABLE_SIGNUP=true`).
- [x] 0.4 Revisar grants reales de Supabase — **RLS_OFF + grants a anon/authenticated en 5 tablas; corregido con migración `20260815080000_hardening_rls`** (RLS_ON, cero grants, verificado).
- [ ] 0.5 Confirmar backups disponibles (PENDIENTE manual: configurar en Supabase).
- [ ] 0.6 Eliminar credenciales de logs y terminales (PENDIENTE manual: revisar history/terminals compartidas).
- [ ] 0.7 Activar monitoreo básico y alertas (PENDIENTE manual: UptimeRobot/Better Stack).

## FASE 1 — INTEGRIDAD FINANCIERA E INVENTARIO

- [ ] 1.1 Corregir concurrencia de anulaciones de ventas (doble devolución de stock).
- [ ] 1.2 Corregir retiros de caja concurrentes.
- [ ] 1.3 Bloquear venta/cierre de caja concurrentes.
- [ ] 1.4 Implementar correlativos PostgreSQL seguros (secuencia o `FOR UPDATE` + reintento).
- [ ] 1.5 Rediseñar idempotencia (hash de payload + usuario + caja + respuesta almacenada).
- [ ] 1.6 Añadir movimientos de devolución de dinero al anular.
- [ ] 1.7 Garantizar auditoría de toda operación financiera.

## FASE 2 — SEGURIDAD DE API Y DATOS

- [ ] 2.1 Completar RLS en `venta_pagos`, `caja_movimientos`, `caja_evidencias`, `inventario_movimientos`, `precios_historico`.
- [ ] 2.2 Revisar todos los grants de Supabase.
- [ ] 2.3 DTOs de salida mínimos por rol (cajero no ve costo/margen).
- [ ] 2.4 Añadir rate limiting (login, registros, búsquedas, URLs firmadas, reportes, catálogo).
- [ ] 2.5 Añadir Helmet, CSP y HSTS.
- [ ] 2.6 Validar CORS estrictamente (lista blanca + validación de entorno).
- [ ] 2.7 Añadir paginación y límites en listados.
- [ ] 2.8 Estandarizar errores (filtro global, requestId, logs JSON).
- [ ] 2.9 Añadir timeout a llamadas externas (GoTrue, Storage).
- [ ] 2.10 Validar rutas y archivos de evidencias (MIME, tamaño, path).
- [ ] 2.11 Validar URL `web` en configuración (solo http/https).
- [ ] 2.12 Validar reglas de negocio: métodos de pago habilitados, factura con cliente/RUC, productos duplicados, límites de descuento, venta bajo costo.

## FASE 3 — FRONTEND ROBUSTO

- [ ] 3.1 Guard único de autenticación (incluye `/pos`; eliminar pantalla "Cargando POS" infinita).
- [ ] 3.2 Manejo correcto de refresh y 401.
- [ ] 3.3 Timeout y cancelación de fetches (AbortController).
- [ ] 3.4 Prevención de doble envío.
- [ ] 3.5 División del POS en módulos.
- [ ] 3.6 Server Components donde corresponda (landing).
- [ ] 3.7 Modales accesibles (role dialog, aria-modal, foco, Escape).
- [ ] 3.8 Validación de URLs.
- [ ] 3.9 DTOs de respuesta mínimos.
- [ ] 3.10 Pruebas con red lenta y errores.

## FASE 4 — RESILIENCIA Y OPERACIÓN

- [ ] 4.1 Backups automáticos cifrados fuera del servidor.
- [ ] 4.2 Restauración automatizada de prueba.
- [ ] 4.3 RPO/RTO documentados (RPO ≤ 24h, RTO ≤ 4h).
- [ ] 4.4 Logs estructurados.
- [ ] 4.5 Métricas y trazas.
- [ ] 4.6 Alertas de errores, latencia y base de datos.
- [ ] 4.7 CI con migraciones de prueba.
- [ ] 4.8 Escaneo de secretos (GitLeaks).
- [ ] 4.9 SBOM y escaneo de dependencias completo.
- [ ] 4.10 Despliegue con aprobación y rollback.
- [ ] 4.11 Migraciones automáticas controladas (`prisma migrate deploy` con respaldo).
- [ ] 4.12 Plan Render (suspensión por inactividad / cold starts).

## FASE 5 — PRUEBAS DE ACEPTACIÓN

- [ ] 5.1 Dos cajeros vendiendo el mismo producto.
- [ ] 5.2 Dos anulaciones simultáneas.
- [ ] 5.3 Venta durante cierre de caja.
- [ ] 5.4 Doble clic en cobrar.
- [ ] 5.5 Reintento tras timeout.
- [ ] 5.6 Caída de API después de recibir el cobro.
- [ ] 5.7 Recuperación desde backup.
- [ ] 5.8 Cajero intentando acceder a administración.
- [ ] 5.9 Lectura directa de tablas Supabase (anon/authenticated).
- [ ] 5.10 Generación simultánea de 100 boletas.
- [ ] 5.11 Redondeos con múltiples productos y cantidades fraccionarias.

---

# Hallazgos Críticos

## 1. Secretos sensibles presentes en `.env`

- `.env:2-11` — contraseña DB, `SERVICE_ROLE_KEY`, `GOTRUE_JWT_SECRET`.
- `DEPLOY.md:63-65` — credenciales demo documentadas.
- `.env` no versionado, pero considerar comprometido.
- **Acción:** rotación total + eliminar demo de doc.

## 2. RLS incompleto

- `apps/api/prisma/migrations/20260814080000_security_rls/migration.sql:7-21`
- Solo cubre: usuarios, categorias, productos, caja_sesiones, clientes, ventas, venta_items, compras, compra_items, configuracion.
- **No cubre:** `venta_pagos`, `caja_movimientos`, `caja_evidencias`, `inventario_movimientos`, `precios_historico`.
- No hay `CREATE POLICY` explícitas.
- Backend usa conexión privilegiada ⇒ compromiso de API = acceso total.

## 3. PostgreSQL y GoTrue publicados en todas las interfaces

- `docker-compose.yml:11-12` — PostgreSQL `5432:5432`.
- `docker-compose.yml:48-49` — GoTrue `9999:9999`.
- **Acción:** red interna Docker, solo Caddy en 443, firewall, `GOTRUE_DISABLE_SIGNUP=true`.

## 4. No hay estrategia comprobable de backup/recuperación

- `docker-compose.yml:13-14` — solo volumen local.
- Sin backups automáticos, copias externas, retención, restauración probada, RPO/RTO.

---

# Backend

## 5. Anulación de ventas vulnerable a doble devolución de stock

- `apps/api/src/ventas/ventas.controller.ts:484-529`
- `apps/api/src/inventario/inventario-movimiento.helper.ts:33-52`
- Mismo patrón en compras: `apps/api/src/compras/compras.controller.ts:316-346`
- **Solución:** `UPDATE ... SET anulada=true WHERE id=? AND anulada=false` + verificar affectedRows en la misma transacción.

## 6. Retiros de caja vulnerables a concurrencia

- `apps/api/src/caja/caja.controller.ts:188-216`
- **Solución:** bloqueo de sesión / operación contable atómica / `SELECT ... FOR UPDATE`.

## 7. El cierre de caja puede competir con ventas

- `apps/api/src/caja/caja.controller.ts:229-297`
- `apps/api/src/ventas/ventas.controller.ts:237-244`
- **Solución:** estado `cerrando`, bloqueo de fila, rechazar operaciones tras iniciar cierre.

## 8. Correlativo de boleta vulnerable a carreras

- `apps/api/src/ventas/ventas.controller.ts:328-346` — patrón `MAX+1`.
- Índice único existe pero una de dos concurrentes falla con P2002.
- **Solución:** secuencia PostgreSQL por serie o `FOR UPDATE` + reintento.

## 9. Idempotencia incompleta

- `apps/api/src/ventas/ventas.controller.ts:227-233` — consulta fuera de transacción.
- Misma clave puede reutilizarse con otro payload; no hay respuesta almacenada; no está ligada a usuario/caja.
- **Solución:** entidad de operación idempotente con hash de payload.

## 10. Consultas sin paginación

- `ventas.controller.ts:157-166`, `productos.controller.ts:132-136`, `caja.controller.ts:74-85`, `caja/evidencias.controller.ts:123-126`, catálogo, usuarios.

## 11. Datos excesivos para cajeros

- `apps/api/src/productos/productos.controller.ts:109-146` — costo, stock, atributos internos.
- `GET /ventas` sin paginación para cajero.
- **Solución:** DTO por rol (mínimo privilegio).

## 12. Reglas de negocio no completamente aplicadas

- Métodos de pago habilitados no se consultan al vender.
- Factura sin cliente/RUC.
- Cliente inexistente no validado.
- Items duplicados permitidos.
- Límites máximos de cantidad/descuento/ítems.
- Venta bajo costo no requiere rol especial.

## 13. Anulación sin movimiento financiero asociado

- No define devolución de efectivo/digital, caja cerrada, reembolso, comprobante impreso.

## 14. Historial de precios incompleto

- `apps/api/src/inventario/precio-historico.service.ts:32-41` — no registra transiciones desde/hacia `null`.
- `precio-historico.service.ts:43-53` + `compras.controller.ts:261-288` — usa cliente global en vez del transaccional.

## 15. Errores internos y logging poco controlados

- `apps/api/src/main.ts:5-21` — sin filtro global de excepciones.
- `auth.service.ts:86-92`, `evidencias.controller.ts:154-163` — mensajes externos filtrados.

## 16. Ausencia de rate limiting y headers de seguridad

- Sin ThrottlerModule, Helmet, CSP, HSTS.
- Afecta login, registro, búsquedas, URLs firmadas, reportes, catálogo.

---

# Frontend

## 17. Credenciales demo visibles en login

- `apps/web/app/login/page.tsx:90-93`

## 18. `/pos` puede quedar bloqueado en "Cargando POS"

- `apps/web/app/pos/page.tsx:110-116`, `162-186`, `440-445`
- Sin guard de sesión; fuera de layout `(admin)`.

## 19. Tokens accesibles desde JavaScript

- `apps/web/lib/supabase.ts:1-6`, `apps/web/lib/use-access-token.ts:6-23`
- Supabase usa almacenamiento web; XSS ⇒ robo de sesión.
- No hay cookies HttpOnly ni sesión server-side.

## 20. Autorización visual insuficiente

- `apps/web/components/admin/AdminLayout.tsx:24-35`, `47-55`
- Menú completo para todo autenticado. Backend sigue siendo la autoridad.

## 21. Fetches sin timeout/cancelación/reintento

- `apps/web/lib/api.ts:27-32`

## 22. Solicitudes obsoletas sobrescriben resultados

- `productos/page.tsx:99-104`, `clientes/page.tsx:29-36`

## 23. Página principal client-side

- `apps/web/app/page.tsx:1-25` — empeora LCP/SEO.

## 24. POS monolítico (>1.100 líneas)

- `apps/web/app/pos/page.tsx`

## 25. Modales sin accesibilidad

- `pos/page.tsx:695-827`, `productos/page.tsx:375-550`

## 26. URL externa configurable sin validación

- `components/landing/Footer.tsx:102-110`, `TestimoniosYContacto.tsx:143-151`
- Solo `https:`/`http:`; rechazar `javascript:`, `data:`, `file:`.

---

# Infraestructura y despliegue

## 27. Render en plan gratuito

- `render.yaml:5` — suspensión por inactividad, cold starts, indisponibilidad.

## 28. Migraciones no automáticas

- `render.yaml:6-7` — build sin `prisma migrate deploy`.

## 29. CI insuficiente para producción

- `.github/workflows/ci.yml` — faltan: escaneo de secretos, SBOM, migraciones de prueba, pruebas de integración/concurrencia, acciones por SHA, aprobación producción, rollback.

## 30. Dependencias con rangos `^`

- `apps/api/package.json:21-34` — usar Dependabot/Renovate + lockfile.

---

# Rendimiento / carga

## Riesgos

- Listados completos sin paginación.
- POS client-side monolítico.
- Búsqueda sin cancelación.
- Sin caché explícita.
- Sin límites de payload.
- Render gratuito.
- Sin métricas/profiling.

## Objetivos

| Métrica | Objetivo |
|---|---|
| API p95 operaciones POS | < 500 ms |
| API p99 operaciones POS | < 1.5 s |
| Búsqueda de producto p95 | < 300 ms |
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| Error rate | < 1% |
| Disponibilidad mensual | > 99.5% |

---

# Reglas de negocio a formalizar

1. ¿Un cajero puede ver costo y margen?
2. ¿Un cajero puede aplicar cualquier descuento?
3. ¿Descuento máximo sin autorización?
4. ¿Quién puede vender bajo costo?
5. ¿Qué ocurre al anular una venta ya cobrada?
6. ¿Cómo se devuelve dinero digital?
7. ¿Se permiten anulaciones después del cierre de caja?
8. ¿La caja se bloquea durante el cierre?
9. ¿Correlativo global o por terminal/sucursal?
10. ¿Qué datos son obligatorios para factura?
11. ¿Qué métodos de pago están activos?
12. ¿Qué pasa si se pierde Internet durante el cobro?
13. ¿Se impide doble clic o se reintenta automáticamente?
14. ¿RPO y RTO aceptables?
15. ¿Quién puede modificar configuración y datos fiscales?

---

# Positivos observados

- `ValidationPipe` global con `whitelist`, `transform`, `forbidNonWhitelisted` (`main.ts:12-17`).
- Verificación JWT restringida a ES256/RS256/HS256 (`auth/jwt-verify.ts:23-37`).
- Roles reconsultados en BD (`roles.guard.ts:37-47`).
- Decremento de stock con `updateMany` + condición `stock >= cantidad` (`ventas.controller.ts:426-438`).
- Restricciones SQL de stock/importes/cantidades e índice de caja única por usuario (`20260814081000_integrity_indexes/migration.sql:2-28`).
- Decimal en vez de float; transacciones con timeout 20s.
- CI con `npm ci`, audit, permisos de GitHub limitados.
