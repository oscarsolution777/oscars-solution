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
- **Fechas:** se guardan en UTC (`timestamptz` para timestamps, `date` para fechas sin hora). Los `timestamptz` (`created_at`, `paid_at`, `last_visit_at`...) se muestran en la zona horaria del salón (`salons.timezone`) vía `formatSalonDate` (`src/lib/utils/dates.ts`). Las columnas `date` puras (`appointment_date`, `preferred_date`, `closure_date`, `hired_at`, `spent_at`, `period_start`/`period_end`...) **no representan un instante** — nunca se les aplica la zona horaria del salón (les restaría un día en salones detrás de UTC, ej. America/Guyana); se muestran con `formatCalendarDate` (mismo archivo), que siempre formatea en UTC. Bug real detectado y corregido en la Fase 2.
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
- Funciones de apoyo del Panel SuperAdmin (Fase 9A, `security definer`, sin tabla propia): `expire_due_demo_salons()` (corrige oportunistamente cualquier demo vencida a `subscription_status='suspended'`, invocada desde el login del panel y desde `/admin/salons`) y `platform_usage_summary()` (métricas agregadas por salón — citas, ingresos cobrados, clientes activos, última actividad — nunca filas individuales de clientes/pagos, sección 7.3).

### Tenant y accesos
- `salons` — id, name, slug (único, para la URL del QR), logo_url, phone, address, timezone, **currency (FK a currencies — moneda en la que el salón cobra a sus clientes)**, **default_locale**, is_active, subscription_status (`trial`|`active`|`suspended`|`cancelled`), **is_demo**, **demo_expires_at (timestamptz, nullable)**, created_at
- `profiles` — id (= auth.users.id), full_name, avatar_url, phone, **locale** (preferencia de idioma del panel)
- `memberships` — user_id, salon_id, role (`owner` | `admin` | `reception`), is_active
  - Una misma persona puede tener varias filas en `memberships` (una por salón) → así una dueña gestiona una **cadena de salones** desde una sola cuenta, con selector de salón activo en el header.

### Catálogo
- `service_categories` — salon_id, name, sort_order, is_active (borrado lógico, igual que el resto de tablas de catálogo — añadido en Fase 1)
- `services` — salon_id, category_id, name, description, features (text[]), price_cents, duration_min (informativo, no bloquea agenda), image_url, is_active, sort_order
- `service_staff` — service_id, staff_id (qué trabajador puede hacer qué servicio)
- `service_products` — service_id, product_id, qty (consumo estándar de inventario por servicio, construido en la Fase 4 junto con el descuento automático de stock). Sin `salon_id` propio (se valida por trigger `check_service_product_same_salon` que ambos pertenezcan al mismo salón). Mismos permisos que "Servicios": owner/admin escritura, reception solo lectura.

### Personas
- `staff` — salon_id, user_id (**siempre nulo por ahora** — los trabajadores no tienen acceso al sistema), full_name, phone, role_title, base_salary_cents, hired_at, is_active. Sin comisiones: solo salario.
- `clients` — salon_id, full_name, phone, email, notes, preferences (jsonb), first_visit_at, last_visit_at, total_spent_cents, is_active (borrado lógico, añadido en Fase 5 — la propia sección de "Reglas de datos" ya exigía nunca hacer `DELETE` de clientes). **Sin `user_id` — el cliente no tiene cuenta ni login, siempre es anónimo/identificado solo por su código de solicitud.** `first_visit_at`/`last_visit_at`/`total_spent_cents` se completan automáticamente en las Fases 4 (citas) y 6 (pagos); hasta entonces quedan vacíos/0.

### Flujo operativo — sin hora, solo fecha; cliente siempre anónimo
Construido en dos etapas: el flujo del panel (confirmar/rechazar, crear la cita) en la **Fase 4** (`source = 'manual'`), y el **Portal QR anónimo** (`/s/[slug]`, `source = 'qr'`) en la **Fase 2** — ver "Portal QR (Fase 2)" más abajo. `public_code` se genera igual en ambos casos (trigger `set_request_public_code`, `encode(gen_random_bytes(12),'hex')`, 96 bits de entropía). Cancelar/reprogramar desde `/estado/[code]` es la **Fase 3**, construida y en producción (ver "Portal QR (Fase 2) y cancelar/reprogramar (Fase 3)" más abajo).
- `requests` — solicitud entrante del portal QR
  - salon_id, **public_code (token corto y no adivinable — es la única "identidad" del cliente)**, client_id (nullable hasta vincular), client_name, client_phone, client_email, preferred_date (date, nullable)
  - status: `pending` | `confirmed` | `rejected` | `cancelled`
  - source: `qr` | `manual`
  - Sin `DELETE`: una corrección se hace cambiando el `status`.
- `request_items` — request_id, service_id, staff_id (nullable hasta que la dueña asigne), service_name_snapshot, price_cents_snapshot. El trigger `snapshot_request_item` fija siempre `service_name_snapshot`/`price_cents_snapshot` leyendo `services` en ese momento, nunca se confía en lo que envíe la aplicación. Sin `salon_id` propio (se deriva vía `request_id`, mismo patrón que `service_staff`).
- `appointments` — cita creada al confirmar la solicitud (`createAppointmentFromRequest`: crea la cita + sus items y marca la solicitud `confirmed`, vinculando o creando el cliente)
  - salon_id, request_id (nullable), client_id, **appointment_date (date)**, total_cents, notes
  - status: `scheduled` | `completed` | `no_show` | `cancelled`
  - El orden dentro del día lo maneja la dueña de palabra; el sistema no gestiona turnos ni horario.
  - `total_cents` lo recalcula siempre el trigger `set_appointment_total` sumando `appointment_items`. Sin `DELETE`: correcciones vía `status`; cambiar la fecha es un `UPDATE` directo de `appointment_date` desde el panel; la reprogramación pedida por el cliente (Fase 3) nunca actualiza esta fila directamente — crea una solicitud nueva, ver sección 6 "Portal QR (Fase 2) y cancelar/reprogramar (Fase 3)".
  - Al pasar a `completed`, el trigger `apply_appointment_completion` (a) inserta en `stock_movements` un movimiento `out` por cada `service_products` de cada servicio de la cita (descuento automático de inventario) y (b) actualiza `clients.first_visit_at`/`last_visit_at`.
- `appointment_items` — appointment_id, service_id, staff_id (el trabajador asignado, obligatorio), price_cents. El trigger `snapshot_appointment_item` fija siempre `price_cents` desde `services`. Sin `salon_id` propio. Sin `DELETE`.

### Portal QR (Fase 2) y cancelar/reprogramar (Fase 3)
Construido en la Fase 2: `/s/[slug]` (catálogo), `/s/[slug]/solicitud` (selección +
formulario) y `/s/[slug]/estado/[code]` (consulta de estado), todo sin cuenta.
Acceso público implementado con un patrón mixto (migración `0013`):
- `salons`/`service_categories`/`services`: `SELECT` directo a `anon` vía RLS
  filtrada (categorías/servicios ya lo tenían desde la Fase 1).
- `staff`: nunca se abre la tabla completa a `anon` (columnas sensibles como
  `phone`/`base_salary_cents`). Solo se expone `id`+`full_name` de activos vía
  la función `security definer` `list_public_staff_for_salon(salon_id)`.
- `requests`/`request_items`: solo `INSERT` a `anon` (`source='qr'`, salón
  activo/trial, servicio activo) — nunca `SELECT` de la tabla completa.
- Consulta de estado: función `security definer` `get_request_status(public_code)`,
  el único `SELECT` posible sobre `requests`, localizado exclusivamente por el
  código (96 bits de entropía — la "contraseña de un solo uso" de la sección
  6). Devuelve `null` si no hay coincidencia, nunca un error.
- Anti-spam (sección 7.7): trigger `check_request_rate_limit` en `requests`
  rechaza más de 5 solicitudes por `(salon_id, client_phone)` por hora, **solo
  para `source='qr'`** (nunca limita las solicitudes manuales del panel).
- Selección de trabajador preferido: se muestran todos los trabajadores
  activos para cualquier servicio (sin filtrar por `service_staff`), igual que
  ya hace el formulario manual del panel.
- Generación del QR: `src/lib/qr/generate-portal-qr.ts` (`qrcode`, 100%
  servidor), mostrado en una tarjeta de Configuración (`/settings`, pestaña
  "Datos del salón" — se construyó en la Fase 10; antes de esa fase vivía
  temporalmente en el Dashboard, que todavía no existía Configuración).

El cliente accede a `/s/[slug]/estado/[code]` (mismo código que recibió al enviar la solicitud) y desde ahí puede, mientras el estado lo permita:
- Consultar el estado (**construido, Fase 2**).
- Cancelar su solicitud o cita (**construido, Fase 3**).
- Pedir cambio de fecha (esto crea una solicitud de reprogramación que la dueña confirma, igual que una solicitud nueva — no se reprograma solo automáticamente para evitar choques que la dueña no vea) (**construido, Fase 3**).

**Fase 3 — implementación:** dos funciones `security definer` más (migración
`0015`, corregidas en `0016`), mismo patrón de localización exclusiva por
`public_code` que `get_request_status`:
- `cancel_request_by_code(public_code)`: cancela la solicitud y, si existe
  una cita vinculada con `status='scheduled'`, también la cancela. Rechaza
  con `already_inactive` si ya estaba `rejected`/`cancelled`, o
  `already_happened` si la cita ya es `completed`/`no_show`. Nunca `DELETE`
  (regla de datos, sección 6): siempre `UPDATE` de `status`.
- `request_reschedule_by_code(public_code, preferred_date)`: solo si el
  estado actual es `pending` o `confirmed`. Crea una fila **nueva** en
  `requests` (`source='qr'`, mismos datos de contacto, la fecha pedida) y
  clona sus `request_items` — la solicitud/cita original **no se toca**. El
  cliente recibe un `public_code` nuevo para la solicitud de reprogramación,
  igual que al enviar cualquier solicitud por primera vez. Sujeta al mismo
  trigger `check_request_rate_limit` que cualquier insert de `requests`
  (verificado: la 5ª reprogramación seguida para el mismo teléfono en una
  hora es rechazada).
- Bug real detectado y corregido en `0016`: un `security definer` con
  `set search_path = public` reemplaza el search_path de la sesión durante
  toda su ejecución — incluyendo triggers disparados dentro de ella. El
  insert de `request_reschedule_by_code` dispara `set_request_public_code`
  (migración `0008`), que llama a `gen_random_bytes()` sin calificar esquema
  (`pgcrypto` vive en `extensions`); con `search_path = public` a secas,
  `extensions` queda fuera y la función fallaba. Corregido a
  `set search_path = public, extensions` en ambas funciones nuevas. Cualquier
  función `security definer` futura que haga `INSERT`/`UPDATE` sobre tablas
  con triggers debe incluir `extensions` en su `search_path` por la misma
  razón.
- UI: botones "Cancelar solicitud" (con `AlertDialog` de confirmación,
  sección 12) y "Pedir cambio de fecha" en `estado/[code]/page.tsx`, visibles
  solo cuando el estado lo permite (mismo criterio duplicado en TypeScript
  que en la función SQL, que lo rechaza igual como defensa real).

### Configuración y multi-salón (Fase 10)

Construida en la Fase 10, ruta `(dashboard)/settings`. Cierra los tres
pendientes que las fases anteriores dejaban explícitamente para después:
autoservicio de datos del salón (migración 0003 decía "escritura solo
SuperAdmin, autoservicio de configuración por la dueña es Fase 10"), selector
de salón activo para dueñas con cadena (`memberships` ya soportaba varias
filas por usuario, pero `getCurrentSession()` siempre usaba la primera), y
auditoría (`audit_log` estaba documentada en la sección "Sistema" de este
mismo archivo pero la tabla nunca se había creado).

- **Selector de salón**: cookie `active_salon_id` (`src/lib/auth/session.ts`,
  `ACTIVE_SALON_COOKIE`) que recuerda cuál de las `memberships` activas de la
  persona es el salón "actual"; `setActiveSalonAction` (`src/lib/auth/actions.ts`)
  la escribe tras validar que el salón pedido está entre sus propias
  memberships. El dropdown (`SalonSwitcher`, en el Sidebar) solo se muestra
  si la persona tiene más de un salón activo.
- **Autoservicio de datos del salón**: función `security definer`
  `update_salon_profile(salon_id, name, logo_url, phone, address, timezone,
  default_locale)` (migración `0017`) — exige rol owner
  (`has_role_in_salon`). Nunca toca `currency`, `subscription_status`,
  `is_demo`, `demo_expires_at`, `slug` ni `is_active`: esas columnas siguen
  siendo exclusivas del Panel SuperAdmin (sección 10). El logo se sube al
  bucket público `salon-logos` (mismo patrón que `service-images` de la Fase
  1, políticas RLS de `storage.objects` solo para owner).
- **Usuarios y roles** (alcance acotado — sin invitar gente nueva, esa
  decisión queda fuera de esta fase): `list_salon_members(salon_id)` y
  `update_salon_membership(membership_id, role, is_active)`, ambas
  `security definer` y owner-only. La segunda rechaza con `cannot_edit_self`
  si la dueña intenta tocar su propia fila, para que no pueda bloquearse a sí
  misma. Los usuarios nuevos los sigue dando de alta el equipo de Oscar's
  Solution, como antes de esta fase.
- **Auditoría** (`audit_log`, migración `0017`): alcance acotado a acciones
  sensibles, no a cada Server Action del panel — cambios de datos del salón y
  de membresías (registrados dentro de las propias funciones SQL de arriba,
  vía el helper `log_audit_event`), y confirmar/rechazar una solicitud o
  cancelar una cita (`requests/actions.ts`, en la aplicación). Activar/
  suspender un salón (Fase 9A, SuperAdmin) queda fuera: es cross-tenant y ya
  tiene su propio panel. Lectura solo para owner (`has_role_in_salon`); sin
  política de `insert` sobre la tabla, la única vía de escritura es
  `log_audit_event`.
- **La tabla genérica `settings` (key/value) de la sección "Sistema" de este
  archivo no se construyó en esta fase**: no había ningún dato concreto que
  la necesitara (moneda, idioma por defecto y timezone ya son columnas
  dedicadas de `salons`). Queda documentada aquí como pendiente real, no como
  omisión accidental.
- **Permisos**: "Configuración" es owner ✅ / admin parcial / reception ❌
  (tabla de la sección 7). "Parcial" para admin significa solo lectura de
  "Datos del salón" (incluye el QR) — las pestañas "Usuarios" y "Auditoría"
  ni siquiera se muestran. `reception` no entra a `/settings` en absoluto
  (bloqueo de página completa, mismo patrón que "Finanzas").

### Dinero
- `payments` — salon_id, client_id, amount_cents, method (`cash` | `card` | `transfer` | `other`), status (`pending` | `paid` | `refunded`), paid_at, reference, **appointment_id (nullable, añadido en la Fase 4 junto con `appointments`; sin UI de vinculación todavía — queda para un pase posterior)**. Al insertar o cambiar el `status`, el trigger `apply_payment_to_client` mantiene `clients.total_spent_cents` sincronizado (suma en `paid`, resta si pasa a `refunded`) — es la pieza de Fase 6 que CLAUDE.md ya anticipaba para ese campo. Ledger de solo `SELECT`/`INSERT`/`UPDATE` (nunca `DELETE`): una corrección se hace cambiando el `status`, no borrando la fila.
- `cash_closures` — cuadre de caja diario, **uno por salón y por día** (`unique(salon_id, closure_date)`): salon_id, closure_date, opening_cash_cents, expected_cash_cents, counted_cash_cents, difference_cents, notes, closed_by, closed_at. `expected_cash_cents` (solo al crear) y `difference_cents` (al crear y editar) los calcula siempre el trigger `apply_cash_closure_computed` — nunca se aceptan desde la aplicación. `expected_cash_cents = opening_cash_cents + Σ pagos en efectivo/pagados de ese día`, comparando la fecha en la **zona horaria del salón**, no en UTC. Sin `DELETE`.
- `expenses` — salon_id, category (texto libre), description, amount_cents, spent_at, supplier_id (nullable, FK a `suppliers` de la Fase 7) — independiente del inventario. Único módulo de esta sección con `DELETE` real (owner): es una captura simple sin efectos derivados aguas abajo, a diferencia de `payments`/`cash_closures`/`staff_payouts`.
- `staff_payouts` — salon_id, staff_id, period_start, period_end, base_cents, bonus_cents (manual), total_cents, status (`pending` | `paid`), paid_at. `total_cents` lo recalcula siempre el trigger `set_payout_total` (`base_cents + bonus_cents`), nunca se confía en el valor enviado por la app. Sin comisiones (sección 13). Sin `DELETE`.

**Permisos distintos dentro de "Dinero" (sección 7):** `payments` y `cash_closures` siguen el patrón simple de `clients`/`inventory` (owner/admin/reception, los 3 con acceso completo). `expenses` y `staff_payouts` están bajo "Finanzas / Nóminas": **admin y reception no tienen ningún acceso, ni de lectura** (no es el patrón "reception ve solo lectura" de `services`/`staff` — aquí el permiso real es cero). Reforzado con `has_role_in_salon(salon_id, array['owner'])` en las 4 políticas RLS de cada tabla, más el bloqueo de la página completa y la ocultación del enlace en el sidebar (`NavItem.restrictedToRoles`).

### Inventario
- `suppliers` — salon_id, name, phone, email, notes, **is_active** (añadido en Fase 7 sobre lo listado aquí originalmente: un proveedor con productos históricos no debe borrarse, se desactiva en su lugar, igual que el resto del catálogo — borrado lógico, nunca `DELETE`)
- `products` — salon_id, name, sku, unit (`ml`|`g`|`unit`), stock_qty, min_stock, cost_cents, price_cents, supplier_id, is_active. `stock_qty` se modifica únicamente a través de `stock_movements` (trigger), nunca por `UPDATE` directo.
- `stock_movements` — salon_id, product_id, type (`in` | `out` | `adjustment` | `loss`), qty, reason, created_by, **appointment_id (nullable, añadido en la Fase 4)**: identifica el movimiento `out` generado automáticamente por el trigger `apply_appointment_completion` al completar una cita; `null` para movimientos manuales. Ledger inmutable (solo `SELECT`/`INSERT`).

### IA
- `ai_analyses` — caché del último resultado de IA por salón (Fase 9B): salon_id, kind (`analysis`|`recommendations`), locale, period_from, period_to (date, ventana fija de 30 días), result (jsonb: string para `analysis`, array de `Recommendation` para `recommendations`), created_at. Único registro por `(salon_id, kind, locale)` — se sobreescribe con `upsert` en cada regeneración, no acumula historial. Permisos: solo owner/admin (`has_role_in_salon(salon_id, array['owner','admin'])` en las 4 políticas RLS), igual que "IA" en la tabla de permisos de la sección 7.

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
7. Rate limiting en el endpoint público de creación de solicitudes y en la búsqueda por `public_code` (anti fuerza-bruta y anti-spam). **Implementado en la Fase 2**: creación de solicitudes limitada por trigger DB (`check_request_rate_limit`, máx. 5/hora por teléfono, solo `source='qr'`); la búsqueda por `public_code` no añade throttling adicional porque el código tiene 96 bits de entropía (fuerza bruta computacionalmente inviable).
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
**Único punto del producto donde se usa IA.** Construido en la **Fase 9B**, ruta `(dashboard)/ai`, visible solo para owner/admin (sección 7).

Dos funciones, ambas server-side, detrás de una interfaz de proveedor intercambiable (`src/lib/ai/provider.ts`):
```ts
interface AiProvider {
  analyzeBusiness(metrics: BusinessMetrics, locale: string): Promise<string>;
  getRecommendations(metrics: BusinessMetrics, locale: string): Promise<Recommendation[]>;
}
```
(`locale` se añadió a la firma para que la respuesta salga en el idioma activo del usuario, tal como pide esta misma sección).
- Implementaciones concretas: `anthropicProvider` (`src/lib/ai/providers/anthropic.ts`, Claude Haiku) y `openaiProvider` (`src/lib/ai/providers/openai.ts`), seleccionables por `AI_PROVIDER` vía `getAiProvider()` (`src/lib/ai/get-provider.ts`). Si falta la API key del proveedor elegido, `getAiProvider()` lanza `AiNotConfiguredError` en vez de un error críptico del SDK.
- `BusinessMetrics` (`src/lib/ai/types.ts`) se construye con `buildBusinessMetrics`/`loadBusinessMetrics` reutilizando literalmente las funciones de `src/lib/reports/aggregations.ts` (Fase 8) sobre una ventana fija de los **últimos 30 días** — nunca se recalcula un KPI aparte para la IA.
- **Analizar negocio** — diagnóstico en lenguaje natural, en el idioma activo del usuario.
- **Recomendaciones** — JSON estructurado y tipado:
  ```ts
  { title: string, area: 'ventas'|'clientes'|'inventario'|'personal'|'precios',
    impact: 'alto'|'medio'|'bajo', reasoning: string, action: string }[]
  ```
Reglas: prompts en `src/lib/ai/prompts/`, salida validada con Zod (`src/lib/validations/ai.ts`), resultados cacheados en `ai_analyses` (sección 6, fresco 24 h, botón "Regenerar" fuerza una llamada nueva), degradación elegante si la API falla o falta la clave (estado dedicado "IA no configurada", nunca un error 500), **cero datos personales en el prompt** (por construcción: `BusinessMetrics` solo trae agregados, nunca filas de `clients`/`payments`).

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

**Estado: construido en la Fase 9A** (las 6 funciones mínimas de arriba están implementadas y en producción). `requirePlatformAdmin()` (`src/lib/auth/guards.ts`) protege la ruta; el login redirige a `/admin/salons` cuando el usuario está en `platform_admins`. Como consecuencia directa de que ahora existe quien controla `subscription_status`, el panel de gestión (`(dashboard)/layout.tsx`) bloquea el acceso con un estado dedicado cuando el salón activo está `suspended`/`cancelled` — antes de esta fase ese campo no tenía ningún efecto en la aplicación. El módulo de **IA** de esta misma fase (sección 9) se construyó después, en la Fase 9B, y ya está en producción.

---

## 11. Hoja de ruta (construir en este orden)

- **Fase 0 — Base:** Next.js + Supabase + Tailwind/shadcn + **next-intl con los 6 idiomas** (aunque el contenido inicial esté completo solo en español y el resto en fallback), layout, login, tablas `salons`/`profiles`/`memberships`/`platform_admins`/`currencies`/`subscription_prices`, RLS base, seed con un salón de demo presentable (moneda GYD, zona horaria America/Guyana, como el primer salón real).
- **Fase 1 — Catálogo:** categorías y servicios (CRUD + imágenes), precios en la moneda del salón.
- **Fase 2 — Portal QR (anónimo):** `/s/[slug]`, selección de servicios (varios servicios, varios trabajadores), envío de solicitud, `public_code`, consulta de estado, generación del QR. **Construida y en producción** — ver sección 6, "Portal QR (Fase 2)".
- **Fase 3 — Cancelar / reprogramar sin cuenta:** acciones desde `/estado/[code]`. **Construida y en producción** — ver sección 6, "Portal QR (Fase 2) y cancelar/reprogramar (Fase 3)".
- **Fase 4 — Solicitudes y Citas (panel):** bandeja, confirmar/rechazar, asignar trabajador y fecha (sin hora), agenda por día, estados.
- **Fase 5 — Clientes y Trabajadores (panel):** fichas, historial, habilidades, rendimiento, salario.
- **Fase 6 — Pagos y Finanzas:** cobros, cuadre de caja diario (por salón), gastos, nóminas, resumen.
- **Fase 7 — Inventario:** productos, proveedores, movimientos, descuento automático, alertas.
- **Fase 8 — Dashboard y Reportes:** KPIs, gráficos, exportación a CSV.
- **Fase 9 — IA + SuperAdmin:** análisis y recomendaciones (proveedor intercambiable); panel SuperAdmin completo (salones, demos, monedas, precios de suscripción). **Panel SuperAdmin (9A) y módulo de IA (9B) construidos** — ver secciones 9 y 10. Pendiente real: cargar `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` en producción (hoy vacías, el módulo de IA degrada a "no configurada").
- **Fase 10 — Multi-salón y pulido:** selector de salón para dueñas con cadena, configuración, auditoría, revisión de traducciones en los 6 idiomas. **Construida y en producción** — ver sección 6, "Configuración y multi-salón (Fase 10)".

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
- Configuración (Fase 10) no incluye invitar usuarios nuevos por email: la dueña solo administra membresías que ya existen (ver, cambiar rol, activar/desactivar). Los usuarios nuevos los sigue dando de alta el equipo de Oscar's Solution.

No hay preguntas abiertas pendientes por el momento. Este documento está listo para empezar la Fase 0.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
