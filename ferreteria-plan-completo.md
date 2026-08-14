# Proyecto Ferretería — Punto de Venta Presencial
Especificación técnica completa · v2.0 · 13 de agosto de 2026

> Cliente: ferretería contactada por Josehp UC. Cotización original: S/3,000-4,000 (dada antes de conocer el alcance real — ver sección 10, alerta de precio). Demo: viernes 14 de agosto. Reunión de alcance y firma: lunes 17 de agosto.
>
> **Cambio de rumbo respecto a v1.0**: el proyecto no es una tienda virtual con carrito (tipo Agusto Market). Es un **sistema de punto de venta (POS) para atención en mostrador** — el cajero registra la venta, no el cliente final desde su celular. Esta versión reemplaza por completo la anterior.

---

## 1. Qué se construye

Un sistema de venta presencial para uso interno de la ferretería: el cajero busca o escanea productos, arma la venta, cobra, imprime el comprobante y el stock se descuenta solo. Aparte, se necesita el lado inverso — registrar cuando entra mercadería nueva — y control de caja al abrir y cerrar el día.

No es una vitrina pública ni un e-commerce. Si más adelante el cliente pide también una tienda en línea, es un proyecto aparte que puede reutilizar el mismo catálogo de productos, pero no es parte de este alcance.

## 2. Roles de usuario

| Rol | Puede hacer |
|---|---|
| **Cajero** | Registrar ventas (Punto de Venta), abrir/cerrar su turno de caja, consultar stock, ver sus propias ventas del día |
| **Administrador** | Todo lo del cajero, más: gestión de productos y categorías, registrar compras/reposición, ver reportes de todas las cajas, configuración del sistema, activar extras contratados |

Con 1-2 puntos de venta no hace falta nada más granular que esto por ahora.

## 3. Módulos del sistema

| Módulo | Qué hace | Rol |
|---|---|---|
| **Punto de Venta** | Pantalla principal de cobro: buscar/escanear producto, armar venta, elegir método de pago, emitir Nota de Venta (y Boleta/Factura si el extra de SUNAT está activo) | Cajero |
| **Productos / Inventario** | Alta, edición, categorías (herramientas, insumos, materiales, ferretería general), stock actual, precio | Administrador |
| **Compras / Reposición** | Registrar ingreso de mercadería de un proveedor, sube el stock | Administrador |
| **Caja** | Apertura de turno (monto inicial), cierre (monto final, diferencia contra lo vendido) | Cajero abre/cierra el suyo, Administrador ve todos |
| **Clientes** | Registro opcional de clientes frecuentes, para historial de compras | Administrador |
| **Reportes** | Ventas por día, top productos, ventas por método de pago, alertas de stock bajo | Administrador |
| **Configuración** | Datos del negocio, formato de impresión por defecto, métodos de pago habilitados, activación de extras contratados | Administrador |

**Explícitamente fuera de alcance**: Cuentas por Cobrar / Cuentas por Pagar (créditos a clientes, deudas a proveedores — eso es contabilidad completa, un proyecto aparte si lo piden), y cualquier función de tienda en línea/vitrina pública.

## 4. Arquitectura técnica

Sin cambios respecto a lo ya decidido — se mantiene por ser el mismo patrón validado en los otros proyectos:

```
Internet
   │ :443 (único puerto expuesto)
   ▼
[Caddy] ── HTTPS automático — dentro de la red interna de Docker, VPS 6 de Contabo
   │
   ├── /          → [Next.js]     interfaz táctil/mouse, cero lógica de negocio
   │
   └── /api       → [NestJS]      toda la lógica: ventas, stock, caja, compras, auth
                        │
                        ├── Prisma → Postgres (Supabase self-hosted: solo Postgres + GoTrue activos)
                        └── SDK server-side de Supabase → GoTrue (interno, sin URL pública)

[Contabo Object Storage 250GB] ← fotos de productos, WebP comprimido
```

Interfaz: diseñada mobile-first / touch-first desde el inicio (botones grandes, poco texto pequeño), porque puede terminar corriendo en tablet tanto como en PC — no se sabe todavía con certeza (ver sección 9, preguntas abiertas).

## 5. Modelo de datos

```sql
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    rol VARCHAR(20) NOT NULL DEFAULT 'cajero',   -- 'cajero' | 'administrador'
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,        -- 'Herramientas', 'Insumos eléctricos', 'Materiales de construcción'...
    orden INT NOT NULL DEFAULT 0
);

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES categorias(id),
    nombre VARCHAR(200) NOT NULL,
    codigo_barras VARCHAR(50) UNIQUE,     -- lo que lee el escáner
    sku VARCHAR(50) UNIQUE,
    precio NUMERIC(10,2) NOT NULL,
    costo NUMERIC(10,2),                  -- para margen, opcional
    stock NUMERIC(10,2) NOT NULL DEFAULT 0,  -- NUMERIC y no INT: hay insumos que se venden por metro/kg/litro
    unidad_medida VARCHAR(20) NOT NULL DEFAULT 'unidad',  -- 'unidad' | 'kg' | 'metro' | 'litro' | 'caja'
    stock_minimo NUMERIC(10,2) NOT NULL DEFAULT 5,
    imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    atributos JSONB NOT NULL DEFAULT '{}',   -- marca, presentación, lo que no amerite columna fija
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE caja_sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    monto_apertura NUMERIC(10,2) NOT NULL,
    monto_cierre NUMERIC(10,2),
    diferencia NUMERIC(10,2),              -- monto_cierre calculado - monto_cierre declarado por el cajero
    abierta_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    cerrada_en TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta'  -- 'abierta' | 'cerrada'
);

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150),
    dni_ruc VARCHAR(20),
    telefono VARCHAR(20),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_sesion_id UUID NOT NULL REFERENCES caja_sesiones(id),
    cliente_id UUID REFERENCES clientes(id),         -- opcional, venta puede ser sin cliente registrado
    vendedor_id UUID NOT NULL REFERENCES usuarios(id),
    tipo_comprobante VARCHAR(20) NOT NULL DEFAULT 'nota_venta',  -- 'nota_venta' | 'boleta' | 'factura'
    metodo_pago VARCHAR(30) NOT NULL,     -- 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin'
    total NUMERIC(10,2) NOT NULL,
    comprobante_ref TEXT,                  -- referencia devuelta por el proveedor SUNAT, si aplica
    formato_impresion VARCHAR(20) DEFAULT 'termica',  -- 'termica' | 'a4' | 'boleta_propia'
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE venta_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id),
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL   -- copia del precio al momento de la venta, no referencia al actual
);

CREATE TABLE compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor_nombre VARCHAR(150),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    total NUMERIC(10,2) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE compra_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES compras(id),
    producto_id UUID NOT NULL REFERENCES productos(id),
    cantidad NUMERIC(10,2) NOT NULL,
    costo_unitario NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_codigo_barras ON productos(codigo_barras);
CREATE INDEX idx_productos_atributos ON productos USING GIN (atributos);
CREATE INDEX idx_ventas_caja_sesion ON ventas(caja_sesion_id);
CREATE INDEX idx_ventas_creado_en ON ventas(creado_en);
```

Notas de diseño:
- `stock` y `cantidad` son `NUMERIC`, no `INT` — confirmaste que se venden insumos por metro, kg o litro, no solo por unidad. Un `INT` ahí habría sido un bug esperando pasar.
- El stock sube automáticamente al registrar una `compra` (trigger o lógica en NestJS que suma a `productos.stock`) y baja al confirmar una `venta` — las dos direcciones, tal como pediste.
- `venta.caja_sesion_id` es obligatorio: toda venta pertenece a un turno de caja abierto. Esto es lo que hace posible el cuadre de caja al cierre — sin este campo, cerrar caja sería adivinar.

## 6. Documentos de venta

Toda venta genera siempre una **Nota de Venta** — documento interno, sin validez tributaria ante SUNAT, imprimible en térmica, A4, o un formato propio de la ferretería (logo, datos del negocio). Esto no depende de ningún extra contratado, es parte del sistema base.

Si el cliente contrata el extra de facturación electrónica (sección 8), la misma venta puede generar además **Boleta o Factura electrónica válida ante SUNAT**, vía la API del proveedor elegido (Lucode, Factpro o APIsPERU — confirmar cuál tiene API real antes de comprometerse, ver documento anterior).

**Sobre la impresión**, dos caminos posibles — para el sistema base, ir por el más simple:

- **Impresión vía navegador** (recomendado para empezar): la Nota de Venta se genera como una vista HTML con CSS de impresión ajustado al ancho de la térmica (`@media print`, `@page { size: 80mm auto }`), y se imprime con el diálogo nativo del navegador. Cero software adicional, funciona con cualquier impresora térmica conectada como impresora del sistema operativo.
- **Impresión directa ESC/POS** (mejora futura, no para el sistema base): impresión de un clic sin diálogo, requiere un servicio local adicional corriendo en la PC de caja. Más rápido para el cajero, pero es una pieza más que puede fallar — se evalúa después de validar que el sistema base funciona bien en el día a día.

## 7. Hardware y periféricos

- **Lector de código de barras**: la gran mayoría funciona como teclado (USB HID) — el lector "escribe" el código y presiona Enter, como si alguien lo tipeara rápido. El campo de búsqueda del Punto de Venta debe estar siempre enfocado y detectar esa entrada rápida seguida de Enter. No se necesita ningún driver ni integración especial — esto simplifica bastante el desarrollo.
- **Impresora térmica**: confirmar modelo antes del lunes — la mayoría son compatibles con impresión estándar del sistema operativo (ver sección 6).
- **Dispositivo de caja**: diseño responsivo/táctil desde el día uno cubre PC, laptop o tablet sin necesitar tres versiones distintas.

## 8. Resiliencia de conexión (no offline completo)

Confirmaste que no se cae del todo el internet — se pone lenta. Es un problema distinto y bastante más simple que "offline-first", así que no se construye la cola de sincronización con resolución de conflictos que se había planteado antes. En su lugar:

- **Actualización optimista en pantalla**: al agregar un producto a la venta, se refleja al instante en la interfaz mientras la confirmación viaja de fondo al servidor.
- **Reintentos automáticos** ante fallos por lentitud/timeout, sin que el cajero tenga que notarlo.
- **Catálogo de productos cacheado localmente** (service worker simple) para no re-descargar todo el catálogo en cada carga de pantalla.
- **PWA instalable**: aunque no se construya el modo offline completo, conviene que el sistema sea instalable como app (ícono en el dispositivo, pantalla completa sin barra de navegador) — mejora la sensación de "sistema de caja" real en vez de una página web. Es una configuración liviana (manifest.json + service worker mínimo), no una reescritura.

**Si más adelante confirman que sí hay cortes reales de internet** (no solo lentitud), ahí sí se reevalúa construir el offline-first completo con cola local — como extra cotizable, no como parte de esta base.

## 9. Extras cotizables — no incluidos en el precio base

| Extra | Qué resuelve | Complejidad | Depende de |
|---|---|---|---|
| Facturación electrónica SUNAT | Boleta/Factura con validez tributaria, no solo Nota de Venta | Media | API de un PSE (Lucode/Factpro/APIsPERU — confirmar cuál) |
| Impresión ESC/POS directa | Imprimir sin diálogo del navegador, un clic | Baja-media | Servicio local en la PC de caja |
| Offline-first completo | Vender aunque se corte el internet del todo, con sincronización | Alta | Solo si se confirma que hay cortes reales, no solo lentitud |
| Segundo punto de venta | Otra caja operando en paralelo con su propia sesión | Baja | Ya contemplado en el modelo de datos (`caja_sesiones`), es más bien configuración que desarrollo nuevo |
| Cuentas por cobrar/pagar | Créditos a clientes, deudas a proveedores — contabilidad completa | Alta | Fuera del dominio de un POS, es otro sistema |
| Pasarela de pago con tarjeta integrada | Cobro con tarjeta procesado desde el propio sistema, no solo un POS físico bancario aparte | Alta | Convenio con Culqi o similar + hardware de lector de tarjeta certificado — poco común pedirlo para una ferretería de este tamaño, casi siempre se cobra con el POS físico del banco por separado |

## 10. Alerta de precio y alcance

Esto hay que decírselo a Josehp antes del lunes, no durante la reunión: la cotización de S/3,000-4,000 se dio pensando en una vitrina con carrito (tipo Agusto Market). El alcance real que salió de esta conversación — punto de venta con caja, compras/reposición de stock, múltiples formatos de comprobante, lector de código de barras — es un sistema bastante más completo que eso.

No es necesariamente un problema — pero **el precio tiene que conversarse de nuevo con el cliente antes de firmar el lunes**, o definir explícitamente qué entra en esos S/3,000-4,000 como fase 1 (Punto de Venta + Productos + Caja) y qué queda como fase 2 cotizada aparte (Compras, Reportes avanzados, extras de la sección 9). Mejor esa conversación incómoda ahora que después de firmado.

## 11. Preguntas abiertas restantes

Ya resueltas: vitrina pública (no), cantidad de cajas (probablemente 1), dispositivo (PC/laptop/tablet, táctil si se puede), lector de código de barras (sí), tipo de comprobante base (Nota de Venta siempre), cierre de caja (sí), compras/reposición (sí), conectividad (lenta, no cortes), uso de FacturalaYa en paralelo (no confirmado, es su demo de prueba).

Pendientes:
1. Modelo exacto de la impresora térmica (para confirmar compatibilidad de impresión estándar).
2. Diseño del formato de "boleta propia" de la ferretería — necesitan pasar logo y datos del negocio.
3. Confirmar con el cliente si van a seguir usando algo de FacturalaYa en paralelo o si este sistema lo reemplaza del todo — no está resuelto, "es una demo, no sé si lo usan" no es un no definitivo.
4. Renegociar o delimitar el precio (sección 10) — conversación pendiente con Josehp antes del lunes.

## 12. Infraestructura

Sin cambios respecto a lo ya decidido: VPS 6 de Contabo, Object Storage de 250GB para imágenes de productos, backups automatizados fuera del VPS, monitoreo activo (UptimeRobot/Better Stack), Caddy como única puerta de entrada.

## 13. Cronograma

| Fecha | Qué pasa |
|---|---|
| Hoy, 13 ago | Definir con Josehp el tema de precio/alcance (sección 10) antes de la demo |
| Viernes 14 ago | Demo: Punto de Venta funcional con productos de ejemplo, Productos/Inventario, Dashboard básico. Caja, Compras y extras se mencionan como "vienen después de firmar", no se muestran a medio construir |
| Lunes 17 ago | Reunión de alcance — resolver preguntas de la sección 11, acordar precio real sobre el alcance real, firmar |
| Post-firma | Se construye Caja, Compras, y se activan los extras que se hayan acordado |

## 14. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-08-12 | v1.0 — versión inicial, planteada como tienda virtual con carrito |
| 2026-08-13 | v2.0 — reescritura completa: el proyecto es un POS presencial, no una vitrina. Nuevo modelo de datos (caja, compras, ventas con NUMERIC para insumos fraccionables), roles cajero/administrador, documentos de venta (Nota de Venta + extra SUNAT), hardware (lector de código de barras, impresora térmica), resiliencia de conexión en vez de offline-first completo, alerta de precio/alcance |
