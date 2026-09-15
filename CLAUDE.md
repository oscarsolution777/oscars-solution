# CLAUDE.md — Oscar's Solution · Sistema Operativo para Salones de Belleza

Este archivo es la fuente de verdad del proyecto. Léelo completo antes de escribir código y respétalo en cada sesión.

---

## 1. Contexto del producto

**Oscar's Solution** es una agencia de IA que construye sistemas de gestión integral para pequeños negocios. Este repositorio es el **primer producto**: un sistema operativo web para **salones de belleza**.

No es "un CRM". Es la plataforma donde vive la operación completa del salón: clientes, citas, trabajadores, inventario, pagos, finanzas, métricas e IA.

### Modelo de negocio
- Se vende como **software por suscripción** (no como desarrollo a medida por cliente).
- **Sin planes por ahora.** Un solo servicio/precio para todos los salones. Los planes se añadirán más adelante cuando esto pivote a un SaaS formal — el esquema deja la puerta abierta (`salons.subscription_status`) pero **no se construye un sistema de planes todavía**.
- **Multi-moneda desde el día uno**, en dos niveles distintos:
  1. El **precio de la suscripción** que tú cobras a cada salón: se fija en **la moneda del país donde vive la dueña** de ese salón (no un único precio global convertido — cada país/moneda tiene su propio precio en `subscription_prices`, definido por el SuperAdmin).
  2. La **moneda en la que cada salón cobra a sus clientes** (el precio de los servicios en su portal QR) — normalmente la misma moneda del país de la dueña.
     Monedas iniciales: **USD, GYD (dólar guyanés), BRL (real brasileño), EUR**, con posibilidad de que el SuperAdmin agregue más sin tocar código (tabla `currencies`, no un enum fijo).
- **Primer salón real (piloto, en Guyana):** opera en **GYD** y zona horaria **America/Guyana**. Estos son los valores de referencia para el seed de la Fase 0.
- **Un único Supabase multi-tenant** para todos los salones. Nunca un despliegue por cliente.
- El dueño de la agencia (Oscar) opera un **Panel SuperAdmin** transversal a todos los salones (ver sección 10).
- **Demo comercial reutilizable:** el mismo Supabase se usa para crear salones de demostración (`is_demo = true`) para prospectos. Cada prospecto interesado recibe **su propio salón de demo** (no literalmente el mismo registro compartido entre varios prospectos a la vez, para no mezclar datos de dos negocios distintos) con `demo_expires_at` a ~3 días vista, para que puedan usarlo con datos reales de su salón y decidir si contratan. Al expirar, el salón pasa a `subscription_status = 'suspended'` automáticamente. El SuperAdmin debe poder crear un demo nuevo en segundos (clonando el catálogo de ejemplo).
- Mercado inicial: el dueño de la agencia vive en Guyana y se muda pronto a Brasil, donde espera tener clientes durante varios años.
- **Multi-idioma en toda la aplicación** (muy importante — ver secciones 2 y 5): español, inglés, portugués, italiano, francés y alemán. Esto aplica al Portal del Cliente, al Panel de Gestión y al Panel SuperAdmin.

### Los 4 subsistemas

| Subsistema | Quién lo usa | Autenticación |
|---|---|---|
| **A. Portal del Cliente** | Cliente final del salón, llega por código QR | **Sin cuenta, siempre anónimo** |
| **B. Panel de Gestión** | Dueña, administradores, recepción | Login obligatorio |
| **C. Cerebro** | Base de datos + capa de IA | Interno / server-only |
| **D. Panel SuperAdmin** | Oscar (dueño de la agencia) | Login obligatorio, fuera de cualquier `salon_id` |

---

## 2. Stack técnico (decidido — no cambiar sin permiso explícito)

- **Framework:** Next.js 15 (App Router) + TypeScript en modo `strict`
- **UI:** Tailwind CSS + shadcn/ui + lucide-react
- **Internacionalización:** `next-intl`, con rutas por idioma (`app/[locale]/...`) y **6 idiomas activos: es, en, pt, it, fr, de**. Español es el idioma base/fuente; los demás se traducen a partir de él.
- **Gráficos:** Recharts
- **Base de datos:** PostgreSQL en Supabase
- **Auth:** Supabase Auth (email + contraseña; magic link opcional) — **solo para el panel de gestión y el panel SuperAdmin**. El portal del cliente nunca pide login.
- **Almacenamiento:** Supabase Storage (imágenes de servicios, logos, avatares)
- **Aislamiento de datos:** Row Level Security (RLS) de Postgres. Obligatorio.
- **Migraciones:** SQL versionado en `supabase/migrations/`
- **IA:** capa abstracta de proveedor (ver sección 9, módulo IA) — no atada a un solo modelo
- **Validación:** Zod en cada entrada (formularios, Server Actions, route handlers)
- **Formularios:** react-hook-form + zodResolver
- **Fechas:** date-fns + `date-fns-tz`. **No se maneja hora de citas, solo fecha.**
- **Tests:** Vitest (unitario) + Playwright (flujo crítico end-to-end)

### Región de despliegue (nota, no bloqueante)
El dueño de la agencia se mudará a Brasil. Al crear el proyecto de Supabase, preferir una región de AWS en Sudamérica si está disponible (ej. São Paulo / `sa-east-1`) para minimizar latencia con los futuros salones brasileños.

### Prohibido sin discutirlo antes
- Añadir ORMs pesados (Prisma, TypeORM) encima de Supabase.
- Añadir librerías de estado global (Redux, Zustand) mientras Server Components + URL state basten.
- Añadir dependencias "por si acaso". Si una dependencia nueva es necesaria, explica por qué antes de instalarla.
- Construir un sistema de planes/tiers de suscripción (fuera de alcance hasta que se indique lo contrario).
- Crear cuentas de cliente / login en el portal público (decisión explícita: **el cliente siempre es anónimo**).

---

## 3. Reglas de trabajo (cómo quiero que operes)

1. **Planifica antes de codear.** Para cualquier tarea que toque más de 2 archivos, escribe primero un plan corto (archivos a crear/modificar, tablas afectadas) y espera confirmación.
2. **Trabaja por fases.** Sigue la hoja de ruta de la sección 11. No construyas módulos de fases posteriores por adelantado.
3. **Pregunta si hay ambigüedad de negocio.** Prefiero 3 preguntas a 300 líneas equivocadas. Si la duda es técnica menor, decide tú y documéntalo.
4. **Incrementos pequeños y funcionales.** Cada entrega debe compilar, pasar lint y poder probarse en el navegador.
5. **No inventes datos ni funcionalidades** que no estén en este documento o que yo no haya pedido.
6. **Nada de mocks en el camino principal.** Datos reales desde Supabase; los datos de ejemplo van solo en `supabase/seed.sql` (deben ser presentables, porque también sirven de demo comercial).
7. **Si cambias el esquema**, crea migración + actualiza tipos + actualiza la sección 7 de este archivo en el mismo commit.
8. **Todo texto nuevo de UI va en los 6 idiomas** (o al menos en español + placeholder claro en los demás, marcado como pendiente de traducir) — nunca un string suelto sin pasar por el sistema de i18n.
9. **No borres código ni datos** sin avisar primero.
10. **Verifica antes de declarar terminado**: `npm run lint && npm run typecheck && npm run build`.
11. **Responde y comenta en español.** El código va en inglés (sección 5).

---

## 4. Comandos del proyecto

```bash
npm run dev          # servidor de desarrollo
npm run build        # build de producción
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run test         # vitest
npm run e2e          # playwright
npm run db:types     # genera src/types/database.ts desde Supabase
npm run db:reset     # resetea la base local y aplica migraciones + seed
npm run i18n:check   # valida que todas las claves existan en los 6 idiomas
```

Variables de entorno en `.env.local` (y documentadas en `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # SOLO servidor. Jamás en un componente cliente.
AI_PROVIDER=anthropic          # anthropic | openai — intercambiable, ver sección 9
AI_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=             # SOLO servidor. Requerida si AI_PROVIDER=anthropic
OPENAI_API_KEY=                # SOLO servidor. Requerida si AI_PROVIDER=openai
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=es
```

---

## 5. Convenciones de código

- **Idioma del código:** identificadores, tablas, columnas, tipos y commits en **inglés**. Todo el texto visible para el usuario pasa por **next-intl**, nunca hardcodeado.
- **Traducciones:** archivos por idioma en `src/lib/i18n/locales/{es,en,pt,it,fr,de}.json`, mismas claves en los 6. `es.json` es la fuente de verdad; si falta una clave en otro idioma, se usa `es` como fallback visible (no se rompe la UI) pero se marca en `npm run i18n:check`.
  - Estos 6 archivos cubren el **texto fijo de la interfaz** (botones, menús, mensajes del sistema) y es responsabilidad de Oscar/Claude Code mantenerlos.
  - El **contenido propio de cada salón** (nombres y descripciones de servicios, notas, etc.) lo escribe **cada dueña en su propio idioma** al cargar su catálogo — el sistema no lo traduce automáticamente. Por eso `services.name`/`description` son simplemente texto libre (no claves de traducción), y el idioma que ve el cliente en el portal es el que la dueña usó al escribirlo (más `salons.default_locale` para el resto de la interfaz del portal).
- **Detección de idioma:**
  - Portal del cliente: se puede fijar un idioma por defecto por salón (`salons.default_locale`, útil si el salón está en Brasil → `pt`), con selector manual visible para el cliente.
  - Panel de gestión / SuperAdmin: preferencia del usuario (`profiles.locale`), con selector en el header.
- **Componentes:** Server Components por defecto. `"use client"` solo cuando haga falta interactividad.
- **Mutaciones:** Server Actions en `actions.ts` junto a la feature. Validar con Zod al entrar.
- **Acceso a datos:** todas las consultas viven en `src/lib/db/<entity>.ts`. Ningún componente llama a Supabase directamente.
- **Dinero:** siempre enteros en céntimos (`price_cents: integer`). Nunca `float`. Formateo solo en la capa de presentación con `formatMoney(amount, currencyCode, locale)`.
- **Fechas:** se guardan en UTC (`timestamptz` para timestamps, `date` para fechas sin hora). Se muestran en la zona horaria del salón (`salons.timezone`) y formateadas según el idioma activo.
- **Nombres:** tablas y columnas en `snake_case` plural; componentes en `PascalCase`; funciones en `camelCase`.
- **Errores:** las Server Actions devuelven `{ ok: true, data }` o `{ ok: false, error: string }` (el `error` es una clave de traducción, no un mensaje final).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `db:`).

### Estructura de carpetas

```
src/
├── app/
│   └── [locale]/
│       ├── (public)/s/[slug]/    # PORTAL DEL CLIENTE (QR) — siempre anónimo
│       │   ├── page.tsx          # catálogo de servicios
│       │   ├── solicitud/        # formulario + envío
│       │   └── estado/[code]/    # consulta de estado, cancelar y reprogramar con el código
│       ├── (auth)/login/         # login del panel de gestión / superadmin
│       ├── (dashboard)/          # PANEL DE GESTIÓN — protegido, por salón activo
│       │   ├── dashboard/
│       │   ├── requests/
│       │   ├── appointments/
│       │   ├── clients/
│       │   ├── services/
│       │   ├── staff/
│       │   ├── inventory/
│       │   ├── payments/
│       │   ├── cash-closures/
│       │   ├── finances/
│       │   ├── reports/
│       │   ├── ai/
│       │   └── settings/
│       └── (superadmin)/admin/   # PANEL SUPERADMIN — protegido, cross-tenant
│           ├── salons/
│           ├── currencies/
│           └── usage/
├── middleware.ts                 # next-intl: detección/routing de idioma
├── components/
│   ├── ui/                       # shadcn
│   └── shared/
├── lib/
│   ├── supabase/                 # clients: server, browser, admin
│   ├── db/                       # capa de acceso a datos por entidad
│   ├── ai/                       # proveedor abstracto + prompts
│   ├── auth/                     # sesión, roles, permisos
│   ├── validations/              # esquemas Zod
│   ├── i18n/
│   │   └── locales/              # es.json, en.json, pt.json, it.json, fr.json, de.json
│   └── utils/
├── types/
│   └── database.ts               # generado — no editar a mano
supabase/
├── migrations/
└── seed.sql
docs/
```

---

## 6. Modelo de datos

**Regla de oro:** toda tabla de negocio lleva `salon_id uuid not null references salons(id)`, más `id uuid default gen_random_uuid()`, `created_at`, `updated_at`. Toda tabla lleva RLS activada. Las tablas de nivel plataforma (`platform_admins`, `currencies`, `subscription_prices`) son la excepción y no llevan `salon_id`.

### Plataforma (nivel Oscar, cross-tenant)
- `platform_admins` — user_id (= auth.users.id). Cualquier fila aquí da acceso total al Panel SuperAdmin.
- `currencies` — code (PK, ISO 4217, ej. `USD`,`GYD`,`BRL`,`EUR`), name, symbol, is_active. Precargada con USD, GYD, BRL, EUR; el SuperAdmin puede agregar más sin desplegar código.
- `subscription_prices` — currency_code (FK a currencies), price_cents, is_active. El precio de la suscripción de Oscar's Solution, uno por moneda soportada.

### Tenant y accesos
- `salons` — id, name, slug (único, para la URL del QR), logo_url, phone, address, timezone, **currency (FK a currencies — moneda en la que el salón cobra a sus clientes)**, **default_locale**, is_active, subscription_status (`trial`|`active`|`suspended`|`cancelled`), **is_demo**, **demo_expires_at (timestamptz, nullable)**, created_at
- `profiles` — id (= auth.users.id), full_name, avatar_url, phone, **locale** (preferencia de idioma del panel)
- `memberships` — user_id, salon_id, role (`owner` | `admin` | `reception`), is_active
  - Una misma persona puede tener varias filas en `memberships` (una por salón) → así una dueña gestiona una **cadena de salones** desde una sola cuenta, con selector de salón activo en el header.

### Catálogo
- `service_categories` — salon_id, name, sort_order, is_active (borrado lógico, igual que el resto de tablas de catálogo — añadido en Fase 1)
- `services` — salon_id, category_id, name, description, features (text[]), price_cents, duration_min (informativo, no bloquea agenda), image_url, is_active, sort_order
- `service_staff` — service_id, staff_id (qué trabajador puede hacer qué servicio)
- `service_products` — service_id, product_id, qty (consumo estándar de inventario por servicio)

### Personas
- `staff` — salon_id, user_id (**siempre nulo por ahora** — los trabajadores no tienen acceso al sistema), full_name, phone, role_title, base_salary_cents, hired_at, is_active. Sin comisiones: solo salario.
- `clients` — salon_id, full_name, phone, email, notes, preferences (jsonb), first_visit_at, last_visit_at, total_spent_cents. **Sin `user_id` — el cliente no tiene cuenta ni login, siempre es anónimo/identificado solo por su código de solicitud.**

### Flujo operativo — sin hora, solo fecha; cliente siempre anónimo
- `requests` — solicitud entrante del portal QR
  - salon_id, **public_code (token corto y no adivinable — es la única "identidad" del cliente)**, client_id (nullable hasta vincular), client_name, client_phone, client_email, preferred_date (date, nullable)
  - status: `pending` | `confirmed` | `rejected` | `cancelled`
  - source: `qr` | `manual`
- `request_items` — request_id, service_id, staff_id (nullable hasta que la dueña asigne), service_name_snapshot, price_cents_snapshot
- `appointments` — cita creada al confirmar la solicitud
  - salon_id, request_id (nullable), client_id, **appointment_date (date)**, total_cents, notes
  - status: `scheduled` | `completed` | `no_show` | `cancelled`
  - El orden dentro del día lo maneja la dueña de palabra; el sistema no gestiona turnos ni horario.
- `appointment_items` — appointment_id, service_id, staff_id (el trabajador asignado), price_cents

### Cancelar / reprogramar sin cuenta
El cliente accede a `/s/[slug]/estado/[code]` (mismo código que recibió al enviar la solicitud) y desde ahí puede, mientras el estado lo permita:
- Cancelar su solicitud o cita.
- Pedir cambio de fecha (esto crea una solicitud de reprogramación que la dueña confirma, igual que una solicitud nueva — no se reprograma solo automáticamente para evitar choques que la dueña no vea).

### Dinero
- `payments` — salon_id, appointment_id (nullable), client_id, amount_cents, method (`cash` | `card` | `transfer` | `other`), status (`pending` | `paid` | `refunded`), paid_at, reference
- `cash_closures` — cuadre de caja diario, **uno por salón y por día**: salon_id, closure_date, opening_cash_cents, expected_cash_cents, counted_cash_cents, difference_cents, notes, closed_by, closed_at
- `expenses` — salon_id, category, description, amount_cents, spent_at, supplier_id (nullable) — independiente del inventario
- `staff_payouts` — salon_id, staff_id, period_start, period_end, base_cents, bonus_cents (manual), total_cents, status, paid_at

### Inventario
- `suppliers` — salon_id, name, phone, email, notes
- `products` — salon_id, name, sku, unit (`ml`|`g`|`unit`), stock_qty, min_stock, cost_cents, price_cents, supplier_id, is_active
- `stock_movements` — salon_id, product_id, type (`in` | `out` | `adjustment` | `loss`), qty, reason, appointment_id (nullable), created_by

### Sistema
- `settings` — salon_id, key, value (jsonb)
- `audit_log` — salon_id, user_id, entity, entity_id, action, diff (jsonb), created_at
- `notifications` — salon_id, type, title, body, is_read, link

### Reglas de datos
- **Snapshots:** los precios y nombres se copian al crear `request_items` / `appointment_items`.
- **Borrado lógico:** nunca `DELETE` en servicios, trabajadores, clientes o productos. Usar `is_active = false`.
- **Stock:** al marcar una cita como `completed` se generan automáticamente los `stock_movements` de tipo `out` según `service_products`.
- **Sin comisiones:** `staff_payouts` solo suma salario base + bonos manuales.
- **Sin choques de horario:** no existe validación de solapamiento; la dueña resuelve manualmente si dos solicitudes caen el mismo día.
- **`public_code` es sensible:** debe ser suficientemente largo/aleatorio para no poder adivinarse (equivalente a una contraseña de un solo uso), porque es el único mecanismo de acceso del cliente a su propia solicitud/cita.
- **Demos con expiración:** un job (o chequeo al leer el salón) debe tratar cualquier salón con `is_demo = true` y `demo_expires_at < now()` como `subscription_status = 'suspended'` automáticamente.

---

## 7. Seguridad y multi-tenant (no negociable)

1. **RLS activada en todas las tablas** (excepto las de plataforma: `platform_admins`, `currencies`, `subscription_prices`, con sus propias políticas de solo-lectura o solo-superadmin).
2. Política base: un usuario del panel solo ve filas cuyo `salon_id` esté en sus `memberships` activas.
3. Un usuario en `platform_admins` puede leer/escribir en `salons`, `currencies`, `subscription_prices` y ver métricas agregadas de todos los tenants, pero **no** tiene acceso de lectura directa a datos sensibles de clientes de un salón salvo necesidad de soporte explícita.
4. El **portal público** (siempre sin cuenta) solo puede: leer `salons` (activo, por slug), `service_categories`, `services` (activos); insertar en `requests`/`request_items`; y leer/actualizar (cancelar, pedir reprogramación) **su propia** solicitud/cita **solo si presenta el `public_code` correcto** — la política de RLS para esto se basa en el código, no en un usuario autenticado.
5. `SUPABASE_SERVICE_ROLE_KEY` solo en código de servidor. Si aparece en un archivo con `"use client"`, es un bug crítico.
6. El `salon_id` **nunca** viaja desde el cliente en una mutación: se deriva en el servidor desde la sesión (panel) o desde el `slug` validado (portal).
7. Rate limiting en el endpoint público de creación de solicitudes y en la búsqueda por `public_code` (anti fuerza-bruta y anti-spam).
8. Los datos personales de clientes nunca se envían a la API de IA. Solo métricas agregadas y anonimizadas.
9. Los módulos con reglas owner/admin de escritura (ver tabla de permisos abajo) se refuerzan con el helper `public.has_role_in_salon(target_salon_id, allowed_roles)` (security definer, mismo patrón que `active_salon_ids()`/`is_platform_admin()`) en las políticas RLS de `insert`/`update` — nunca solo en la Server Action, porque el navegador tiene acceso directo a PostgREST con la sesión del usuario. Introducido en Fase 1 para `service_categories`/`services`; reutilizable en fases futuras.

### Permisos por rol (panel de gestión)

| Módulo | owner | admin | reception |
|---|:--:|:--:|:--:|
| Dashboard | ✅ | ✅ | parcial |
| Solicitudes / Citas | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Servicios | ✅ | ✅ | lectura |
| Trabajadores | ✅ | ✅ | lectura |
| Inventario | ✅ | ✅ | ✅ |
| Pagos / Cuadre de caja | ✅ | ✅ | ✅ |
| Finanzas / Nóminas | ✅ | ❌ | ❌ |
| Reportes | ✅ | ✅ | ❌ |
| IA | ✅ | ✅ | ❌ |
| Configuración | ✅ | parcial | ❌ |

No existe rol `staff` con acceso al sistema — los trabajadores no inician sesión. Los permisos se comprueban **dos veces**: en la UI (ocultar) y en el servidor (bloquear). La UI nunca es la seguridad.

---

## 8. Flujos principales

### Flujo 1 — Cliente por QR (siempre anónimo)
```
QR → /s/[slug] (en el idioma por defecto del salón, con selector) →
   ve servicios (precio en la moneda del salón, descripción, características, imagen) →
   selecciona uno o varios servicios (pueden ir con distintos trabajadores preferidos) →
   introduce nombre + teléfono (+ fecha preferida opcional, sin hora) →
   envía → recibe un CÓDIGO PÚBLICO (su única forma de acceso futuro) →
   con ese código, en /s/[slug]/estado/[code] puede:
     - consultar el estado
     - cancelar
     - pedir reprogramación (crea una nueva solicitud de cambio de fecha
       que la dueña confirma, no es automática)
```
El portal debe ser **mobile-first**.

### Flujo 2 — Panel de gestión
```
Llega la solicitud → "Solicitudes / Nuevas" (con notificación) →
   la dueña la revisa → CONFIRMA o RECHAZA →
   al confirmar: asigna trabajador a cada servicio + fija la FECHA (sin hora) →
   si varias solicitudes caen el mismo día, la dueña las ordena de palabra →
   se crea la CITA y se vincula o crea el CLIENTE →
   scheduled → completed / no_show / cancelled →
   al completar: se registra el PAGO, se descuenta INVENTARIO →
   al final del día: CUADRE DE CAJA (uno por salón y por día) →
   todo alimenta dashboard, reportes y finanzas
```

### Flujo 3 — Cierre financiero
```
Pagos + Cuadre de caja diario + Gastos (independientes de inventario)
   + Nóminas (salario + bonos manuales)
   → Resumen financiero por día / semana / mes
   → Reportes por servicio, trabajador, cliente e inventario
```

### Flujo 4 — SuperAdmin (Oscar)
```
Login superadmin → ve lista de todos los salones (nombre, suscripción, si es demo
   y cuándo expira) → activa/suspende un salón → crea un salón de demo nuevo para
   un prospecto (clona catálogo de ejemplo, fija demo_expires_at a +3 días) →
   administra currencies y subscription_prices → ve métricas agregadas de uso.
```

---

## 9. Módulos del sistema

```
├── DASHBOARD          KPIs, resumen, alertas, actividad reciente
├── SOLICITUDES        nuevas, confirmadas, rechazadas, reprogramaciones pedidas
├── CITAS              agenda por día (sin hora), estados, asignaciones
├── CLIENTES           perfil, historial, servicios, pagos, preferencias (sin login propio)
├── SERVICIOS          categorías, descripción, precios, duración informativa, trabajadores, productos
├── TRABAJADORES       perfil, servicios, rendimiento, salario (sin comisiones)
├── INVENTARIO         productos, stock, movimientos, proveedores, alertas
├── PAGOS              cobros a clientes, métodos, historial, cuadre de caja diario
├── FINANZAS           ingresos, pagos a trabajadores, gastos, resumen
├── REPORTES           ventas, clientes, servicios, trabajadores, inventario
├── IA                 análisis del negocio, recomendaciones (único uso de IA en el producto)
├── CONFIGURACIÓN      datos del salón, moneda, idioma por defecto, usuarios, roles, QR
└── SUPERADMIN         salones (alta/baja/suscripción/demo), monedas, precios de suscripción, uso agregado
```

### KPIs del Dashboard (definiciones exactas)
- **Ingresos** del periodo: suma de `payments.amount_cents` con `status = 'paid'`, en la moneda del salón
- **Citas completadas** / **tasa de no-show**: `no_show / (completed + no_show)`
- **Ticket promedio**: ingresos ÷ citas completadas
- **Servicios más vendidos** (top 5 por unidades y por ingresos)
- **Carga de trabajo por trabajador**: nº de servicios asignados en el periodo
- **Clientes nuevos vs recurrentes** en el periodo
- **Solicitudes pendientes** sin responder
- **Productos bajo mínimo** (`stock_qty <= min_stock`)
- **Diferencia de caja acumulada** (suma de `cash_closures.difference_cents` del periodo)

### Módulo de IA
**Único punto del producto donde se usa IA.**

Dos funciones, ambas server-side, detrás de una interfaz de proveedor intercambiable (`src/lib/ai/provider.ts`):
```ts
interface AiProvider {
  analyzeBusiness(metrics: BusinessMetrics): Promise<string>;
  getRecommendations(metrics: BusinessMetrics): Promise<Recommendation[]>;
}
```
- Implementaciones concretas: `anthropicProvider` (Claude Haiku) y `openaiProvider`, seleccionables por `AI_PROVIDER`.
- **Analizar negocio** — diagnóstico en lenguaje natural, en el idioma activo del usuario.
- **Recomendaciones** — JSON estructurado y tipado:
  ```ts
  { title: string, area: 'ventas'|'clientes'|'inventario'|'personal'|'precios',
    impact: 'alto'|'medio'|'bajo', reasoning: string, action: string }[]
  ```
Reglas: prompts en `src/lib/ai/prompts/`, salida validada con Zod, resultados cacheados, degradación elegante si la API falla, **cero datos personales en el prompt**.

---

## 10. Panel SuperAdmin (Oscar)

Ruta protegida `(superadmin)/admin`, solo para usuarios en `platform_admins`. Fuera del contexto de `salon_id`.

Funciones mínimas:
- Listado de todos los salones: nombre, slug, moneda, idioma, estado de suscripción, si es demo y cuándo expira.
- Activar / suspender un salón.
- **Crear demo:** generar un salón nuevo con `is_demo = true`, clonar un catálogo de ejemplo, fijar `demo_expires_at` (+3 días por defecto, ajustable).
- Crear un salón real (alta de cliente que ya pagó) con su primera membership `owner`.
- Gestionar `currencies` (activar/agregar monedas) y `subscription_prices` (precio de la suscripción por moneda).
- Ver métricas agregadas de uso por salón, sin entrar a los datos de clientes/trabajadores de ese salón.

Se construye en la **Fase 9**, pero el modelo de datos se deja listo desde la Fase 0.

---

## 11. Hoja de ruta (construir en este orden)

- **Fase 0 — Base:** Next.js + Supabase + Tailwind/shadcn + **next-intl con los 6 idiomas** (aunque el contenido inicial esté completo solo en español y el resto en fallback), layout, login, tablas `salons`/`profiles`/`memberships`/`platform_admins`/`currencies`/`subscription_prices`, RLS base, seed con un salón de demo presentable (moneda GYD, zona horaria America/Guyana, como el primer salón real).
- **Fase 1 — Catálogo:** categorías y servicios (CRUD + imágenes), precios en la moneda del salón.
- **Fase 2 — Portal QR (anónimo):** `/s/[slug]`, selección de servicios (varios servicios, varios trabajadores), envío de solicitud, `public_code`, consulta de estado, generación del QR.
- **Fase 3 — Cancelar / reprogramar sin cuenta:** acciones desde `/estado/[code]`.
- **Fase 4 — Solicitudes y Citas (panel):** bandeja, confirmar/rechazar, asignar trabajador y fecha (sin hora), agenda por día, estados.
- **Fase 5 — Clientes y Trabajadores (panel):** fichas, historial, habilidades, rendimiento, salario.
- **Fase 6 — Pagos y Finanzas:** cobros, cuadre de caja diario (por salón), gastos, nóminas, resumen.
- **Fase 7 — Inventario:** productos, proveedores, movimientos, descuento automático, alertas.
- **Fase 8 — Dashboard y Reportes:** KPIs, gráficos, exportación a CSV.
- **Fase 9 — IA + SuperAdmin:** análisis y recomendaciones (proveedor intercambiable); panel SuperAdmin completo (salones, demos, monedas, precios de suscripción).
- **Fase 10 — Multi-salón y pulido:** selector de salón para dueñas con cadena, configuración, auditoría, revisión de traducciones en los 6 idiomas.

**Definición de "terminado" para cada fase:**
compila · pasa lint y typecheck · migraciones aplicadas · RLS probada con dos salones distintos · funciona en móvil · estados de carga, vacío y error implementados · seed actualizado · textos nuevos presentes en los 6 idiomas (o marcados como pendientes).

---

## 12. Criterios de UX

- **Mobile-first en el portal del cliente.** El panel de gestión se usa desde **navegador de escritorio normal** (no PWA).
- Tono cercano y profesional en cada idioma (no traducción literal palabra por palabra — adaptar naturalidad).
- Cada lista necesita sus tres estados: cargando, vacío (con acción sugerida) y error.
- Acciones destructivas siempre con confirmación.
- Formularios: validación en línea, mensajes claros, nunca perder lo escrito por un error.
- Máximo 3 clics desde el dashboard hasta cualquier acción frecuente.
- Accesibilidad: contraste suficiente, labels reales, navegación por teclado.

---

## 13. Decisiones cerradas (para no volver a preguntarlas)

- El precio de suscripción se define por país/moneda de la dueña, no como un único monto convertido a las 4 monedas — cada nuevo mercado puede tener su propio precio en `subscription_prices`.
- El primer salón real opera en **GYD**, zona horaria **America/Guyana**.
- La reprogramación pedida desde `/estado/[code]` **no notifica** a la dueña por ningún canal externo — simplemente aparece como una solicitud pendiente más en su bandeja.
- La traducción del contenido de cada salón la hace **cada dueña, en su propio idioma**, al cargar su catálogo. El texto fijo del sistema (los 6 archivos de `locales/`) lo mantiene Oscar/Claude Code.

No hay preguntas abiertas pendientes por el momento. Este documento está listo para empezar la Fase 0.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
