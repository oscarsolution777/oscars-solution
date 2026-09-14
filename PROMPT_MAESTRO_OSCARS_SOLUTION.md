# PROMPT MAESTRO — Oscar's Solution · Sistema Operativo para Salones de Belleza
> **Versión 1.0 — Fuente de verdad del proyecto. Leer completo antes de escribir código.**

---

Eres un desarrollador senior full-stack especializado en Next.js 15, TypeScript estricto, Supabase y sistemas multi-tenant SaaS. Vas a construir "Oscar's Solution", un sistema operativo web completo para salones de belleza. Antes de escribir una sola línea de código, lee y memoriza todo lo que sigue.

---

## ████  1. IDENTIDAD DEL PRODUCTO

No es un CRM. Es la plataforma donde vive la operación completa de un salón de belleza: clientes, citas, trabajadores, inventario, pagos, finanzas, métricas e IA. Se vende como SaaS por suscripción. Un solo Supabase multi-tenant para todos los salones. Nunca un despliegue por cliente.

**Agencia:** Oscar's Solution (el dueño es Oscar).  
**Primer salón real (piloto):** opera en GYD, zona horaria America/Guyana.

---

## ████  2. LOS 4 SUBSISTEMAS

| Subsistema | Quién lo usa | Autenticación |
|---|---|---|
| **A. PORTAL DEL CLIENTE** `/s/[slug]/...` | Cliente final. Acceso por QR. SIEMPRE anónimo. Nunca pide login. Mobile-first obligatorio. | Sin cuenta |
| **B. PANEL DE GESTIÓN** `/(dashboard)/...` | Dueña, admin, recepción. Desktop (navegador normal, no PWA). | Login obligatorio |
| **C. CEREBRO** | Supabase (DB + IA). Interno, server-only. | Interno |
| **D. PANEL SUPERADMIN** `/(superadmin)/admin/...` | Solo Oscar (tabla platform_admins). Cross-tenant. Sin salon_id en contexto. | Login obligatorio |

---

## ████  3. STACK TÉCNICO — NO MODIFICAR SIN PERMISO EXPLÍCITO

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| i18n | next-intl · rutas `app/[locale]/...` · 6 idiomas: **es, en, pt, it, fr, de** · Español = base/fuente |
| Gráficos | Recharts |
| BD | PostgreSQL en Supabase |
| Auth | Supabase Auth (email+password; magic link opcional). SOLO panel gestión y superadmin. Portal cliente: jamás. |
| Storage | Supabase Storage (imágenes, logos, avatares) |
| Aislamiento | Row Level Security (RLS) — OBLIGATORIO en todas las tablas |
| Migraciones | SQL versionado en `supabase/migrations/` |
| IA | Capa abstracta de proveedor (anthropic \| openai), intercambiable |
| Validación | Zod en cada entrada (formularios, Server Actions, route handlers) |
| Formularios | react-hook-form + zodResolver |
| Fechas | date-fns + date-fns-tz. SOLO FECHA en citas, nunca hora. |
| Tests | Vitest (unitario) + Playwright (e2e flujos críticos) |

### PROHIBIDO sin discutir:
- ✗ ORMs pesados (Prisma, TypeORM)
- ✗ Estado global (Redux, Zustand) mientras Server Components + URL state basten
- ✗ Dependencias "por si acaso"
- ✗ Sistema de planes/tiers (fuera de alcance)
- ✗ Login en el portal del cliente (decisión explícita y cerrada)

---

## ████  4. VARIABLES DE ENTORNO (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # SOLO servidor. Jamás en "use client".
AI_PROVIDER=anthropic             # anthropic | openai
AI_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_API_KEY=                # SOLO servidor
OPENAI_API_KEY=                   # SOLO servidor
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=es
```

---

## ████  5. CONVENCIONES DE CÓDIGO — INAMOVIBLES

### Idioma del código
- Identificadores, tablas, columnas, tipos, commits: **inglés**
- Todo texto visible al usuario: **next-intl**. Nunca un string hardcodeado.
- Respuestas y comentarios de Claude: **español**

### Traducciones
- Archivos: `src/lib/i18n/locales/{es,en,pt,it,fr,de}.json`
- `es.json` es la fuente de verdad. Si falta clave → fallback a `es`
- Texto fijo del sistema: responsabilidad de Oscar/Claude
- Contenido del salón (nombres de servicios, etc.): lo escribe cada dueña en su idioma. No se traduce automáticamente.

### Detección de idioma
- Portal cliente: `salons.default_locale` + selector manual visible
- Panel gestión / SuperAdmin: `profiles.locale` + selector en header

### Componentes
- Server Components por defecto
- `"use client"` solo cuando haga falta interactividad real

### Mutaciones
- Server Actions en `actions.ts` junto a la feature
- Validar con Zod al entrar
- Retornan: `{ ok: true, data }` | `{ ok: false, error: string }`
- El campo `error` es una CLAVE de traducción, no un mensaje final

### Acceso a datos
- Todas las consultas en `src/lib/db/<entity>.ts`
- Ningún componente llama a Supabase directamente

### Dinero
- SIEMPRE enteros en céntimos (`price_cents: integer`). Nunca float.
- Formateo SOLO en presentación con `formatMoney(amount, currencyCode, locale)`

### Fechas
- Guardadas en UTC (`timestamptz` / `date`)
- Mostradas en `salons.timezone`, formateadas según idioma activo
- Las citas NO tienen hora. Solo fecha.

### Nomenclatura
- Tablas y columnas: `snake_case` plural
- Componentes: `PascalCase`
- Funciones: `camelCase`

### Commits
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `db:`

---

## ████  6. ESTRUCTURA DE CARPETAS

```
src/
├── app/
│   └── [locale]/
│       ├── (public)/s/[slug]/
│       │   ├── page.tsx              # Catálogo de servicios (Portal QR)
│       │   ├── solicitud/            # Formulario de solicitud
│       │   └── estado/[code]/        # Estado, cancelar, reprogramar
│       ├── (auth)/login/             # Login panel gestión / superadmin
│       ├── (dashboard)/              # PANEL DE GESTIÓN (protegido)
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
│       └── (superadmin)/admin/       # SUPERADMIN (protegido, cross-tenant)
│           ├── salons/
│           ├── currencies/
│           └── usage/
├── middleware.ts                     # next-intl: detección/routing de idioma
├── components/
│   ├── ui/                           # shadcn
│   └── shared/
├── lib/
│   ├── supabase/                     # clients: server, browser, admin
│   ├── db/                           # acceso a datos por entidad
│   ├── ai/                           # proveedor abstracto + prompts
│   ├── auth/                         # sesión, roles, permisos
│   ├── validations/                  # esquemas Zod
│   ├── i18n/
│   │   └── locales/                  # es.json en.json pt.json it.json fr.json de.json
│   └── utils/
├── types/
│   └── database.ts                   # generado — NO editar a mano
supabase/
├── migrations/
└── seed.sql
docs/
```

---

## ████  7. MODELO DE DATOS COMPLETO

**Regla de oro:** toda tabla de negocio lleva:
```sql
id          uuid default gen_random_uuid() PRIMARY KEY
salon_id    uuid not null references salons(id)
created_at  timestamptz default now()
updated_at  timestamptz default now()
```
RLS activada siempre.

### Nivel Plataforma (sin salon_id)

**`platform_admins`**
- `user_id uuid PK` (= auth.users.id)
- Cualquier fila aquí da acceso total al SuperAdmin

**`currencies`**
- `code varchar(3) PK` (ISO 4217: USD, GYD, BRL, EUR...)
- `name text`, `symbol text`, `is_active boolean default true`
- Precargada con USD, GYD, BRL, EUR. SuperAdmin puede agregar más sin desplegar código.

**`subscription_prices`**
- `currency_code varchar(3) FK → currencies(code)`
- `price_cents integer`, `is_active boolean`
- Un precio de suscripción de Oscar's Solution por moneda. No es conversión global.

### Tenant y Accesos

**`salons`**
- `id`, `name`, `slug` (único para URL QR), `logo_url`, `phone`, `address`
- `timezone text` (ej. "America/Guyana")
- `currency varchar(3) FK → currencies(code)` — moneda en que cobra a sus clientes
- `default_locale varchar(5)` — idioma por defecto del portal QR
- `is_active boolean`
- `subscription_status: 'trial'|'active'|'suspended'|'cancelled'`
- `is_demo boolean default false`
- `demo_expires_at timestamptz nullable`
- `created_at`

**`profiles`**
- `id uuid PK` (= auth.users.id)
- `full_name text`, `avatar_url text`, `phone text`
- `locale varchar(5)` — preferencia de idioma del panel

**`memberships`**
- `user_id uuid FK → profiles(id)`
- `salon_id uuid FK → salons(id)`
- `role: 'owner'|'admin'|'reception'`
- `is_active boolean`
- Una persona puede tener varias filas (cadena de salones). Selector de salón activo en el header del panel.

### Catálogo

**`service_categories`** — `salon_id`, `name`, `sort_order`

**`services`** — `salon_id`, `category_id`, `name`, `description`, `features text[]`, `price_cents integer`, `duration_min integer` (informativo), `image_url`, `is_active`, `sort_order`

**`service_staff`** — `service_id FK → services`, `staff_id FK → staff`

**`service_products`** — `service_id`, `product_id`, `qty numeric` (consumo estándar)

### Personas

**`staff`**
- `salon_id`, `user_id` (**SIEMPRE NULO** — trabajadores no acceden al sistema)
- `full_name`, `phone`, `role_title`
- `base_salary_cents integer` (sin comisiones — solo salario)
- `hired_at date`, `is_active`

**`clients`**
- `salon_id`, `full_name`, `phone`, `email`, `notes`
- `preferences jsonb`
- `first_visit_at date`, `last_visit_at date`, `total_spent_cents integer`
- SIN `user_id`. El cliente no tiene cuenta. Identificado solo por `public_code`.

### Flujo Operativo

**`requests`**
- `salon_id`
- `public_code text UNIQUE` — token corto no adivinable, única identidad del cliente
- `client_id uuid nullable FK → clients`
- `client_name text`, `client_phone text`, `client_email text`
- `preferred_date date nullable` (sin hora)
- `status: 'pending'|'confirmed'|'rejected'|'cancelled'`
- `source: 'qr'|'manual'`

**`request_items`**
- `request_id FK → requests`
- `service_id FK → services`
- `staff_id uuid nullable FK → staff`
- `service_name_snapshot text`, `price_cents_snapshot integer`

**`appointments`**
- `salon_id`, `request_id uuid nullable`, `client_id FK → clients`
- `appointment_date date` (sin hora)
- `total_cents integer`, `notes text`
- `status: 'scheduled'|'completed'|'no_show'|'cancelled'`

**`appointment_items`**
- `appointment_id FK → appointments`
- `service_id FK → services`
- `staff_id FK → staff`
- `price_cents integer`

### Dinero

**`payments`** — `salon_id`, `appointment_id nullable`, `client_id`, `amount_cents`, `method: 'cash'|'card'|'transfer'|'other'`, `status: 'pending'|'paid'|'refunded'`, `paid_at timestamptz`, `reference text`

**`cash_closures`** — uno por salón y por día: `salon_id`, `closure_date date`, `opening_cash_cents`, `expected_cash_cents`, `counted_cash_cents`, `difference_cents`, `notes`, `closed_by uuid FK → profiles`, `closed_at timestamptz`

**`expenses`** — `salon_id`, `category text`, `description text`, `amount_cents integer`, `spent_at date`, `supplier_id nullable`

**`staff_payouts`** — `salon_id`, `staff_id`, `period_start date`, `period_end date`, `base_cents integer`, `bonus_cents integer`, `total_cents integer`, `status text`, `paid_at timestamptz`

### Inventario

**`suppliers`** — `salon_id`, `name`, `phone`, `email`, `notes`

**`products`** — `salon_id`, `name`, `sku`, `unit: 'ml'|'g'|'unit'`, `stock_qty numeric`, `min_stock numeric`, `cost_cents integer`, `price_cents integer`, `supplier_id nullable`, `is_active`

**`stock_movements`** — `salon_id`, `product_id`, `type: 'in'|'out'|'adjustment'|'loss'`, `qty numeric`, `reason text`, `appointment_id nullable`, `created_by uuid FK → profiles`

### Sistema

**`settings`** — `salon_id`, `key text`, `value jsonb`

**`audit_log`** — `salon_id`, `user_id`, `entity`, `entity_id`, `action`, `diff jsonb`, `created_at`

**`notifications`** — `salon_id`, `type`, `title`, `body`, `is_read`, `link`

---

## ████  8. REGLAS DE DATOS CRÍTICAS

| Regla | Detalle |
|---|---|
| **SNAPSHOTS** | Precios y nombres se copian al crear `request_items` y `appointment_items` |
| **BORRADO LÓGICO** | NUNCA DELETE en servicios, trabajadores, clientes o productos. Usar `is_active = false` |
| **STOCK** | Al marcar appointment como `completed` → generar `stock_movements` tipo `out` según `service_products` automáticamente |
| **COMISIONES** | No existen. `staff_payouts` = salario base + bonos manuales |
| **HORARIO** | No hay validación de solapamiento. La dueña resuelve manualmente |
| **PUBLIC_CODE** | Suficientemente largo/aleatorio (equivalente a contraseña de un uso) |
| **DEMOS** | Salón con `is_demo = true` y `demo_expires_at < now()` → tratar como `subscription_status = 'suspended'` automático |
| **MULTI-MONEDA** | `subscription_prices` = precio que Oscar cobra por moneda/país de la dueña. `currency` en `salons` = moneda en que el salón cobra a sus clientes. NO son el mismo campo, no se mezclan. |

---

## ████  9. SEGURIDAD Y MULTI-TENANT — NO NEGOCIABLE

1. **RLS activada en TODAS las tablas.** Excepción: `platform_admins`, `currencies`, `subscription_prices` (tienen sus propias políticas)
2. Política base: un usuario del panel solo ve filas cuyo `salon_id` esté en sus `memberships` activas
3. Usuario en `platform_admins`: puede leer/escribir `salons`, `currencies`, `subscription_prices` y ver métricas agregadas. NO tiene acceso directo a datos sensibles de clientes de un salón
4. Portal público (anónimo) SOLO puede:
   - Leer: `salons` (activo, por slug), `service_categories`, `services` (activos)
   - Insertar: `requests`, `request_items`
   - Leer/actualizar su propia solicitud/cita SOLO con el `public_code` correcto
5. `SUPABASE_SERVICE_ROLE_KEY` solo en código de servidor. Si aparece en `"use client"` → BUG CRÍTICO
6. El `salon_id` NUNCA viaja desde el cliente en una mutación. Se deriva en el servidor desde la sesión (panel) o desde el slug validado (portal)
7. Rate limiting: endpoint público de creación de solicitudes y búsqueda por `public_code`
8. Datos personales de clientes NUNCA se envían a la API de IA. Solo métricas agregadas y anonimizadas

### Permisos por Rol

| Módulo | owner | admin | reception |
|---|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | parcial |
| Solicitudes / Citas | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ |
| Servicios | ✅ | ✅ | lectura |
| Trabajadores | ✅ | ✅ | lectura |
| Inventario | ✅ | ✅ | ✅ |
| Pagos / Caja | ✅ | ✅ | ✅ |
| Finanzas / Nóminas | ✅ | ❌ | ❌ |
| Reportes | ✅ | ✅ | ❌ |
| IA | ✅ | ✅ | ❌ |
| Configuración | ✅ | parcial | ❌ |

**Permisos se comprueban DOS VECES: en UI (ocultar) y en servidor (bloquear). La UI nunca es la seguridad.**

---

## ████  10. MÓDULO DE IA

ÚNICO punto del producto donde se usa IA.

Interfaz abstracta en `src/lib/ai/provider.ts`:

```typescript
interface AiProvider {
  analyzeBusiness(metrics: BusinessMetrics): Promise<string>;
  getRecommendations(metrics: BusinessMetrics): Promise<Recommendation[]>;
}

type Recommendation = {
  title: string;
  area: 'ventas' | 'clientes' | 'inventario' | 'personal' | 'precios';
  impact: 'alto' | 'medio' | 'bajo';
  reasoning: string;
  action: string;
}
```

Implementaciones: `anthropicProvider` (Claude Haiku) y `openaiProvider`. Seleccionable por `AI_PROVIDER`.

**Reglas:**
- Prompts en `src/lib/ai/prompts/`
- Salida validada con Zod
- Resultados cacheados
- Degradación elegante si la API falla
- CERO datos personales en el prompt (solo métricas agregadas)
- Análisis devuelto en el idioma activo del usuario

---

## ████  11. KPIs DEL DASHBOARD (definiciones exactas)

| KPI | Definición SQL |
|---|---|
| Ingresos del periodo | `SUM(payments.amount_cents) WHERE status='paid'` |
| Citas completadas | `COUNT(appointments) WHERE status='completed'` |
| Tasa de no-show | `no_show / (completed + no_show)` |
| Ticket promedio | ingresos ÷ citas completadas |
| Servicios más vendidos | Top 5 por unidades y por ingresos |
| Carga por trabajador | Nº servicios asignados en el periodo |
| Clientes nuevos vs recurrentes | En el periodo |
| Solicitudes pendientes | Sin responder |
| Productos bajo mínimo | `stock_qty <= min_stock` |
| Diferencia de caja | `SUM(cash_closures.difference_cents)` del periodo |

---

## ████  12. FLUJOS PRINCIPALES

### Flujo 1 — Cliente por QR (siempre anónimo, mobile-first)
```
QR → /s/[slug] (idioma por defecto del salón + selector)
  → ve servicios (precio en moneda del salón, descripción, imagen)
  → selecciona uno o varios servicios (con trabajadores preferidos distintos)
  → introduce nombre + teléfono (+ fecha preferida opcional, sin hora)
  → envía → recibe CÓDIGO PÚBLICO (única forma de acceso futuro)
  → con ese código en /s/[slug]/estado/[code] puede:
      - consultar estado
      - cancelar
      - pedir reprogramación (crea solicitud que la dueña confirma; no es automática)
```

### Flujo 2 — Panel de Gestión
```
Solicitud llega → "Solicitudes / Nuevas" (con notificación)
  → dueña revisa → CONFIRMA o RECHAZA
  → al confirmar: asigna trabajador a cada servicio + fija FECHA (sin hora)
  → si varias solicitudes en el mismo día: dueña ordena de palabra
  → se crea la CITA → se vincula o crea el CLIENTE
  → scheduled → completed / no_show / cancelled
  → al completar: PAGO registrado + INVENTARIO descontado
  → fin del día: CUADRE DE CAJA (uno por salón y día)
  → todo alimenta dashboard, reportes y finanzas
```

### Flujo 3 — Cierre Financiero
```
Pagos + Cuadre caja diario + Gastos + Nóminas (salario + bonos manuales)
  → Resumen financiero día / semana / mes
  → Reportes: servicio, trabajador, cliente, inventario
```

### Flujo 4 — SuperAdmin (Oscar)
```
Login → lista de todos los salones (nombre, suscripción, demo + expiración)
  → activar/suspender salón
  → crear salón demo (clona catálogo ejemplo, demo_expires_at = +3 días ajustable)
  → crear salón real (alta de cliente ya pagado, membership owner)
  → gestionar currencies y subscription_prices
  → ver métricas de uso agregadas (sin acceder a datos de clientes)
```

---

## ████  13. HOJA DE RUTA — CONSTRUIR EN ESTE ORDEN ESTRICTO

| Fase | Nombre | Entregables clave |
|---|---|---|
| **0** | BASE | Next.js 15 + Supabase + Tailwind/shadcn + next-intl (6 idiomas). Layout, login, tablas: salons, profiles, memberships, platform_admins, currencies, subscription_prices. RLS base. Seed: salón demo en GYD / America/Guyana. |
| **1** | CATÁLOGO | Categorías y servicios (CRUD + imágenes). Precios en moneda del salón. |
| **2** | PORTAL QR | `/s/[slug]`: selección de servicios + trabajadores, envío de solicitud, `public_code`, consulta de estado, generación del QR. |
| **3** | CANCELAR/REPROGRAMAR | Acciones desde `/s/[slug]/estado/[code]`. |
| **4** | SOLICITUDES Y CITAS | Bandeja, confirmar/rechazar, asignar trabajador y fecha (sin hora), agenda por día, estados. |
| **5** | CLIENTES Y TRABAJADORES | Fichas, historial, habilidades, rendimiento, salario. |
| **6** | PAGOS Y FINANZAS | Cobros, cuadre de caja diario, gastos, nóminas, resumen. |
| **7** | INVENTARIO | Productos, proveedores, movimientos, descuento automático, alertas. |
| **8** | DASHBOARD Y REPORTES | KPIs exactos, gráficos Recharts, exportación CSV. |
| **9** | IA + SUPERADMIN | Análisis y recomendaciones (proveedor intercambiable). Panel SuperAdmin completo. |
| **10** | MULTI-SALÓN Y PULIDO | Selector de salón para cadenas, configuración, auditoría, revisión completa de traducciones en los 6 idiomas. |

### Definición de "Terminado" por Fase:
- ✅ Compila
- ✅ Pasa lint y typecheck
- ✅ Migraciones aplicadas
- ✅ RLS probada con dos salones distintos
- ✅ Funciona en móvil (portal) / desktop (panel)
- ✅ Estados de carga, vacío y error implementados
- ✅ Seed actualizado
- ✅ Textos nuevos en los 6 idiomas (o marcados como pendientes)

---

## ████  14. CRITERIOS DE UX — NO NEGOCIABLES

- Mobile-first en el portal del cliente
- Panel de gestión: desktop (navegador normal, no PWA)
- Tono cercano y profesional en cada idioma (no traducción literal)
- Cada lista: 3 estados obligatorios → cargando / vacío (con acción) / error
- Acciones destructivas: siempre con confirmación
- Formularios: validación inline, mensajes claros, nunca perder lo escrito
- Máximo 3 clics desde el dashboard hasta cualquier acción frecuente
- Accesibilidad: contraste suficiente, labels reales, navegación por teclado

---

## ████  15. REGLAS DE TRABAJO — CÓMO OPERAR

1. **PLANIFICA ANTES DE CODEAR.** Para cualquier tarea que toque más de 2 archivos: escribe primero un plan corto (archivos a crear/modificar, tablas afectadas) y espera confirmación.
2. **TRABAJA POR FASES.** No construyas módulos de fases posteriores por adelantado.
3. **PREGUNTA SI HAY AMBIGÜEDAD DE NEGOCIO.** Prefiero 3 preguntas a 300 líneas equivocadas. Duda técnica menor: decide y documéntalo.
4. **INCREMENTOS PEQUEÑOS Y FUNCIONALES.** Cada entrega debe compilar, pasar lint y poder probarse en el navegador.
5. **NO INVENTES** datos ni funcionalidades fuera de este documento.
6. **NADA DE MOCKS EN EL CAMINO PRINCIPAL.** Datos reales desde Supabase. Datos de ejemplo solo en `supabase/seed.sql` (deben ser presentables — también son demo comercial).
7. **SI CAMBIAS EL ESQUEMA:** migración + actualizar tipos + documentar.
8. **TODO TEXTO NUEVO DE UI** va en los 6 idiomas (o placeholder marcado como pendiente). Nunca un string sin pasar por next-intl.
9. **NO BORRES** código ni datos sin avisar primero.
10. **VERIFICACIÓN** antes de declarar terminado: `npm run lint && npm run typecheck && npm run build`
11. **RESPONDE Y COMENTA EN ESPAÑOL.** El código va en inglés.

---

## ████  16. DECISIONES CERRADAS (no volver a preguntar)

- El precio de suscripción se define por país/moneda de la dueña en `subscription_prices`. No es un único monto convertido.
- Primer salón real: GYD, timezone America/Guyana.
- Reprogramación pedida desde `/estado/[code]` NO notifica a la dueña por canal externo. Aparece como solicitud pendiente en su bandeja.
- El contenido del catálogo lo traduce cada dueña en su idioma. El sistema no lo traduce. Los 6 archivos `locales/` los mantiene Oscar.
- No hay sistema de planes/tiers todavía (`salons.subscription_status` existe como campo pero no se construye la lógica de planes).
- Los trabajadores NO tienen acceso al sistema (`staff.user_id = null`).

---

## ████  17. SISTEMA DE DISEÑO VISUAL — REPLICAR EXACTAMENTE

> **Las imágenes de la carpeta "SISTEMA DE GESTIÓN" son la fuente de verdad visual.**
> En caso de conflicto entre esta descripción y las imágenes, **LAS IMÁGENES GANAN.**
> Referencia de archivos: `2__Portal_Cliente.png`, `3_1__Dashboard.png`, `3_2__Dashboard.png`,
> `3_3__Dashboard.png`, `4_Solicitudes_y_Citas.png`, `5_1__Clientes.png`, `5_2__Clientes.png`,
> `6_1___Servicios.png`, `6_2__Servicios.png`, `7__Trabajadores.png`, `8__Inventario.png`,
> `9__Finanzas.png`, `10__Reportes_y_Métricas.png`, `11__Asistente_IA.png`, `12__Configuración.png`

---

### 17.1 TOKENS DE DISEÑO — PALETA OFICIAL

```css
/* ── COLORES BASE ── */
--color-primary:           #E8375A   /* Rosa-coral. CTA principal, nav activo, botones primarios,
                                        precio en portal QR, badges "Nueva", underline tab activo */
--color-primary-hover:     #D42E4F
--color-primary-light:     #FDE8ED   /* Fondo de íconos KPI (ingresos) */
--color-primary-soft:      #FFF0F3   /* Hover de filas, fondo de alertas suaves */

--color-sidebar-bg:        #1A1D2E   /* Sidebar oscuro — casi negro azulado */
--color-sidebar-text:      #9CA3C4   /* Texto inactivo en sidebar */
--color-sidebar-active-bg: #E8375A   /* Fondo del ítem activo en sidebar */
--color-sidebar-active-text: #FFFFFF

--color-topbar-bg:         #FFFFFF
--color-topbar-border:     #F0F0F0

--color-content-bg:        #F7F8FC   /* Fondo gris muy claro del área de contenido */
--color-card-bg:           #FFFFFF
--color-card-border:       #F0F2F5
--color-card-shadow:       0 1px 4px rgba(0,0,0,0.06)

--color-text-primary:      #1A1D2E   /* Títulos y datos importantes */
--color-text-secondary:    #6B7280   /* Subtítulos, labels, metadatos */
--color-text-muted:        #9CA3AF   /* Placeholders, texto muy suave */

/* ── COLORES SEMÁNTICOS ── */
--color-success:           #22C55E   /* "Completado", "Activo", flecha positiva */
--color-success-bg:        #DCFCE7
--color-warning:           #F59E0B   /* "Pendiente", alertas de stock */
--color-warning-bg:        #FEF3C7
--color-danger:            #EF4444   /* "Cancelado", stock bajo, flecha negativa */
--color-danger-bg:         #FEE2E2
--color-info:              #8B5CF6   /* "Confirmada", badges informativos */
--color-info-bg:           #EDE9FE

/* ── ÍCONOS KPI (círculos de color detrás del ícono en tarjetas) ── */
--kpi-ingresos-bg:         #FDE8ED   /* Rosa claro — ícono $ */
--kpi-citas-bg:            #EDE9FE   /* Violeta claro — ícono calendario */
--kpi-clientes-bg:         #DCFCE7   /* Verde claro — ícono personas */
--kpi-servicios-bg:        #FEF3C7   /* Ámbar claro — ícono tijeras */
--kpi-trabajadores-bg:     #DBEAFE   /* Azul claro — ícono persona */

/* ── BADGES DE CATEGORÍAS (servicios) ── */
--badge-coloracion:  bg #FDE8ED / text #E8375A
--badge-corte:       bg #EDE9FE / text #8B5CF6
--badge-unas:        bg #FEF9C3 / text #CA8A04
--badge-faciales:    bg #DCFCE7 / text #16A34A
--badge-peinados:    bg #DBEAFE / text #2563EB
--badge-cejas:       bg #FEE2E2 / text #DC2626

/* ── RECHARTS — paleta de gráficos ── */
/* Colores de series en orden: */
Serie 1: #E8375A
Serie 2: #8B5CF6
Serie 3: #22C55E
Serie 4: #F59E0B
Serie 5: #3B82F6
Serie 6: #EC4899
Fondo gráficos: transparente sobre --color-card-bg
Ejes y grillas: #E5E7EB
```

---

### 17.2 TIPOGRAFÍA

```
Familia: Inter (Google Fonts) — única familia en toda la app.

Escala de tamaños:
  --text-xs:   11px / line-height 1.4  → metadatos, versión footer
  --text-sm:   13px / line-height 1.5  → labels de tabla, texto secundario
  --text-base: 14px / line-height 1.5  → cuerpo general, filas de tabla
  --text-md:   15px / line-height 1.5  → nav items sidebar
  --text-lg:   18px / line-height 1.4  → subtítulos de sección
  --text-xl:   22px / line-height 1.3  → títulos de página (h1)
  --text-2xl:  28px / line-height 1.2  → números KPI grandes
  --text-3xl:  36px / line-height 1.1  → KPI hero (ingresos del día)

Pesos usados: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
Números KPI grandes: font-weight 700, color --color-text-primary
```

---

### 17.3 LAYOUT GENERAL — PANEL DE GESTIÓN

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (200px fijo, bg #1A1D2E)                            │
│  • Logo 32x32 + nombre salón (blanco, semibold) + subtítulo  │
│  • Nav items: ícono lucide + número + nombre                 │
│  • Ítem ACTIVO: bg #E8375A, texto white, border-radius 8px,  │
│    margen lateral 8px                                        │
│  • Ítem INACTIVO: texto #9CA3C4, hover suave                 │
│  • FOOTER SIDEBAR:                                           │
│    - Foto salón 48px + nombre + plan + "Ver mi plan" primary │
│    - Ícono headset + "¿Necesitas ayuda?"                     │
│                                                              │
│  ÁREA PRINCIPAL (flex-1, bg #F7F8FC)                         │
│  • TOPBAR (64px, bg white, border-bottom #F0F0F0)            │
│    - Título h1 + subtítulo (izquierda)                       │
│    - Fecha + ícono | campana + badge | avatar + nombre + rol │
│  • CONTENIDO (padding 24px, gap 16px entre cards)            │
│    - Scroll vertical. Sin scroll horizontal.                 │
└──────────────────────────────────────────────────────────────┘
```

**Sidebar detalles:**
- `width: 200px` fijo desktop, collapsible en tablet (solo íconos 48px)
- Logo/ícono del salón: 32×32px, esquina superior izquierda
- Número del módulo: prefijo gris oscuro antes del nombre

**Topbar detalles:**
- `height: 64px`
- Título h1: `text-xl`, `font-weight 700`
- Fecha: `text-sm`, `font-weight 500`, con ícono calendario
- Badge notificaciones: círculo `#E8375A`, número blanco
- Avatar: círculo 36px, nombre `text-sm font-600`, rol `text-xs`

---

### 17.4 COMPONENTES REUTILIZABLES

#### KPI CARD (tarjeta de métrica)
```
bg: white | border-radius: 12px | padding: 20px | shadow: --color-card-shadow
Layout:
  • Label (text-sm, gris) — arriba izquierda
  • Ícono en círculo de color (40×40px) — arriba derecha
  • Número grande (text-3xl, bold) — centro izquierda
  • Flecha ↑/↓ + color + "X% vs ayer" (text-xs) — debajo del número
  • Mini sparkline Recharts sin ejes — al fondo de la card
Dashboard principal: 5 KPIs en fila horizontal con sparkline
Módulos internos: 3-4 KPIs sin sparkline
```

#### DATA TABLE
```
Header: bg white | text-xs | color #6B7280 | font-weight 600 | border-bottom #F0F2F5
Filas:  bg white | hover bg #FFF0F3 | height 56px | border-bottom 1px solid #F9FAFB
  • Columna foto/avatar: imagen redonda 36px
  • Columna nombre: text-sm font-600 + dato secundario text-xs debajo
  • Badges de estado: pill redondeado, colores semánticos
  • Columna acciones: botón "..." o íconos
Fila seleccionada: bg --color-primary-soft | border-left 3px solid #E8375A
Paginación: centrada, botones numéricos, primario activo rojo
Footer: "Mostrando X a Y de Z"
```

#### PANEL LATERAL DE DETALLE
```
Posición: derecha de la tabla (no modal) | width ~380px
bg: white | border-left: 1px solid #F0F2F5
Header: título "Detalle de X" + botón "✏ Editar" (outline primary) + botón × cerrar
Secciones: título text-sm font-600 + separador border-bottom 1px #F5F5F5
Botones de acción al fondo (siempre 3):
  1. Cancelar / destructivo: outline gris
  2. Acción secundaria: outline primary
  3. Acción principal: filled primary (#E8375A)
```

#### TABS DE NAVEGACIÓN INTERNA
```
Tab activo:   texto #E8375A | underline 2px solid #E8375A
Tab inactivo: texto #6B7280 | hover texto #1A1D2E
Badge de conteo: círculo pequeño bg #E8375A texto white junto al nombre del tab
```

#### BOTONES
```
PRIMARIO:    bg #E8375A | texto white | font-600 | border-radius 8px | padding 10px 18px
             hover: #D42E4F | con ícono: lucide 16px + gap 6px
OUTLINE:     border 1.5px solid #E8375A | texto #E8375A | bg transparent | hover bg #FFF0F3
SECUNDARIO:  border 1.5px solid #E5E7EB | texto #374151 | bg white
```

#### BADGES / PILLS
```
border-radius: 999px | padding: 3px 10px | font-weight 500 | text-xs

"Nueva":       bg #FDE8ED  text #E8375A
"Pendiente":   bg #FEF3C7  text #D97706
"Confirmada":  bg #EDE9FE  text #7C3AED
"Completado":  bg #DCFCE7  text #16A34A
"Cancelado":   bg #FEE2E2  text #DC2626
"Bajo Stock":  bg #FEE2E2  text #DC2626
"Suficiente":  bg #DCFCE7  text #16A34A
"VIP":         bg #FEF3C7  text #D97706
"Regular":     bg #F3F4F6  text #6B7280
"Activo":      bg #DCFCE7  text #16A34A
```

#### FORMULARIO / INPUT
```
border: 1.5px solid #E5E7EB | border-radius: 8px | padding: 10px 14px | text-sm
focus: border-color #E8375A | ring 2px #FDE8ED
label: text-sm | font-weight 500 | color #374151 | mb-1
error: border #EF4444 | mensaje text-xs #EF4444 debajo del campo
```

#### TOGGLE SWITCH
```
Activo:   bg #E8375A | círculo blanco
Inactivo: bg #D1D5DB
Usado en: estado de servicios, métodos de pago en configuración
```

---

### 17.5 PANTALLA POR PANTALLA — ESPECIFICACIÓN EXACTA

#### PANTALLA 1 — PORTAL DEL CLIENTE (ref: `2__Portal_Cliente.png`)

**Pantalla 1.1 — Portal de Inicio (mobile):**
- Header: logo del salón + nombre en fuente script cursiva + subtítulo
- Foto hero a pantalla completa detrás del header
- Bloque bienvenida: bg white, border-radius 16px 16px 0 0, título bold, subtítulo gris, botón primario "Ver servicios"
- Info contacto: íconos (reloj, teléfono, ubicación) + texto sm
- Social links: íconos IG, Facebook, WhatsApp en fila
- `max-width: 430px`, centrado, padding 20px

**Pantalla 1.2 — Catálogo de Servicios:**
- Título "Nuestros Servicios" centrado, subtítulo gris centrado
- Filtro categorías: pills horizontales scrolleables
  - Activo: bg #E8375A, texto white
  - Inactivo: bg white, border #E5E7EB, texto gris
- Grid servicios: 1 col móvil, 2 col tablet, 4 col desktop
- Cada card: imagen cuadrada redondeada (border-radius 12px), nombre bold, descripción text-sm gris (2 líneas max), precio en primary bold, duración con ícono reloj text-xs gris

**Pantalla 1.3 — Detalle del Servicio:**
- Topbar: flecha ← + ícono share derecha
- Imagen grande (aspect-ratio 16/9, border-radius 12px)
- Nombre + precio primary inline
- Duración con ícono reloj
- Sección "Incluye": lista con checkmarks ✓ en primary
- Botón sticky fondo: "Seleccionar servicio" (full-width, primary)

**Pantalla 1.4 — Carrito / Mi Selección:**
- Header: "Mi selección" + ícono carrito con badge conteo
- Lista servicios: imagen redonda 40px + nombre bold + precio primary + ícono papelera
- Separador + Total alineado derecha bold
- Botón "Continuar" full-width primary sticky

**Pantalla 1.5 — Datos del Cliente:**
- Header: "Tus datos" + ← atrás
- Campos: Nombre completo, Teléfono (ícono WhatsApp verde), Correo (opcional), Fecha preferida (datepicker), Notas adicionales (textarea)
- Labels encima de cada campo, text-sm font-500
- Botón "Enviar solicitud" full-width primary sticky al fondo

**Pantalla 1.6 — Confirmación:**
- Ícono check en círculo primary centrado arriba
- "¡Solicitud enviada!" centrado bold
- Subtítulo explicativo centrado
- Card resumen: bg #FFF0F3, border-radius 12px, lista servicios + precios + total bold
- Botón outline "Ir al inicio"

**Pantalla 1.7 — Estado de la Solicitud (`/estado/[code]`):**
- Título centrado + subtítulo
- Timeline vertical: ícono círculo (✓ completado=primary, ⏳ en proceso=ámbar, ○ pendiente=gris), línea vertical conectando pasos, nombre estado bold + descripción text-sm + timestamp derecha
- Pasos: Solicitud recibida → En revisión → En espera de confirmación → Confirmada → Completada
- Footer portal: 4 íconos con texto, fondo #FFF0F3

---

#### PANTALLA 2 — DASHBOARD (ref: `3_1__Dashboard.png`, `3_2__Dashboard.png`, `3_3__Dashboard.png`)

**Topbar:**
- "¡Bienvenida, [nombre]! 👋" — text-2xl font-700
- Subtítulo: "Aquí tienes un resumen..." text-sm gris

**Fila de 5 KPI Cards (con sparkline):**
Ingresos del día | Citas de hoy | Clientes nuevos (mes) | Servicios realizados | Trabajadores activos

**Layout de 3 columnas:**

Col. izquierda ~50%: **"Solicitudes y citas"**
- Tabs: Nuevas [badge rojo] | Pendientes [badge ámbar] | Confirmadas [badge violeta] | Canceladas [badge gris]
- Lista: avatar 40px + nombre+teléfono + servicios + fecha/hora + badge estado (3 filas)
- Link "Ver todas las solicitudes" centrado en primary

Col. central ~30%: **"Resumen financiero (Mes actual)"**
- Ingresos en primary bold + Gastos en rojo bold + % variación
- Donut chart Recharts con leyenda: Pagos de clientes (verde), Pagos a trabajadores (primary), Gastos operativos (ámbar), Otros ingresos (violeta)
- Total Neto en centro del donut bold

Col. derecha ~20%: **"Alertas inteligentes"**
- Lista: ícono en círculo de color + título bold + descripción xs + tiempo relativo
- Link "Ver todas las alertas"

**Fila de 6 Módulos Rápidos (bottom):**
Clientes | Servicios | Trabajadores | Inventario | Reportes | IA - Asistente
- Cada uno: ícono en color + nombre + número total + link "Ver [módulo] →" en primary

---

#### PANTALLA 3 — SOLICITUDES Y CITAS (ref: `4_Solicitudes_y_Citas.png`)

**4 KPI Cards (sin sparkline):**
Solicitudes nuevas (Hoy: N) | Pendientes (Más antigua: N días) | Confirmadas (Hoy: N) | Canceladas (Este mes)

**Tabs + Botón:**
`Solicitudes nuevas [12]` | `Pendientes [8]` | `Confirmadas [24]` | `Canceladas [5]`
Botón `+ Nueva solicitud manual` primary alineado derecha

**Barra de filtros:**
Rango de fechas | Todos los servicios (select) | Todos los trabajadores (select) | Buscador | Filtros

**Tabla ~55% ancho:**
- Columnas: Cliente (avatar+nombre+teléfono) | Servicio(s)+precio | Fecha solicitada + tiempo relativo | Estado (badge)
- Fila seleccionada: highlight + borde left primary

**Panel Detalle ~45%:**
- Header: "Detalle de la solicitud" + ID #REQ-... + badge estado + ×
- Info cliente: avatar 48px + nombre + teléfono + tiempo
- Sección "Servicios solicitados": imagen 48px + nombre + descripción + precio
- Total estimado en primary bold
- "Información adicional": Preferencia de fecha | Notas | ¿Cómo nos conoció? | Estado actual
- **3 botones**: "× Cancelar solicitud" (outline gris) | "📅 Programar cita" (outline primary) | "✓ Confirmar solicitud" (filled primary)

---

#### PANTALLA 4 — CLIENTES (ref: `5_1__Clientes.png`, `5_2__Clientes.png`)

**Vista Lista (`5_2__Clientes.png`):**
- 5 KPIs: Total Clientes | Clientes Nuevos (Mes) | Visitas Promedio/Mes | Retención | Clientes VIP
- Tabs: Todos | Recientes | VIP | Inactivos | Estabonados — Botón `+ Nuevo Cliente` primary
- Tabla: Foto | Nombre+teléfono+email | Última visita | Estado (VIP/Regular)
- Panel lateral "Detalle del Cliente": datos personales + historial + servicios (chips) + pagos + preferencias + notas
- Botones: Ver historial completo | Editar Perfil | Agendar nueva cita

**Vista Perfil Completo (`5_1__Clientes.png`):**
- ← Volver a clientes
- Header: avatar 80px + nombre h2 + badge "Cliente frecuente" + contacto + 4 stats en fila (Total visitas, Total gastado, Última visita, Cliente desde)
- Botón "✏ Editar cliente" outline primary + menú "⋮"
- Tabs internos: Resumen | Historial de visitas | Servicios realizados | Pagos | Preferencias | Notas importantes
- Tab Resumen — 3 columnas:
  - Col 1: Historial de visitas cronológico (día bold + servicio + stylist + monto + badge)
  - Col 2: Donut "Servicios más frecuentes" + "Información del cliente" (datos personales)
  - Col 3: "Resumen rápido" (stats) + "Preferencias" (lista con íconos) + "Notas importantes" (card amarilla)

---

#### PANTALLA 5 — SERVICIOS (ref: `6_1___Servicios.png`, `6_2__Servicios.png`)

**4 KPIs:**
Total de servicios (Activos) | Categorías (Activas) | Precio promedio | Duración promedio

**Tabs + Botones:**
`Servicios` | `Categorías` | `Productos utilizados` — Botones: "↓ Exportar" (outline) | `+ Nuevo servicio` (primary)

**Tabla:**
- Columnas: Servicio (imagen 40px + nombre bold + descripción xs) | Categoría (badge color) | Precio | Duración | Trabajadores (avatares apilados + "+N") | Estado (toggle switch) | Acciones "..."

**Panel Detalle Servicio:**
- "Detalle del servicio" + "✏ Editar" outline primary
- Imagen 80px + nombre h3 + descripción + badge "Activo"
- Metadatos con íconos: Categoría | Precio | Duración
- "Trabajadores capacitados (N)": avatares circulares + "+N"
- "Productos utilizados (N)": imágenes cuadradas de productos
- "Descripción" texto largo + "Recomendaciones"

---

#### PANTALLA 6 — TRABAJADORES (ref: `7__Trabajadores.png`)

**4 KPIs:**
Trabajadores activos | Servicios realizados hoy | Comisiones del mes | Rendimiento promedio

**Tabs:**
`Lista de trabajadores` | `Horarios` | `Servicios que realizan` | `Comisiones y pagos` | `Rendimiento`
Botón `+ Nuevo trabajador` primary

**Tabla:**
- Columnas: Trabajador (avatar+nombre+rol title) | Rol (badge por tipo) | Servicios (íconos+"+N") | Citas hoy | Comisiones (mes) | Rendimiento (barra progreso verde + %) | Estado (Activo/Descanso) | Acciones "..."

**Panel Detalle Trabajador:**
- Nombre + rol + contacto + badge "Activo"
- Tabs: Resumen | Servicios | Horarios | Rendimiento
- Info general: fecha ingreso, rol, comisión %, método de pago
- Estadísticas del mes: 2×2 grid (citas, servicios, ingresos, comisiones)
- "Próximas citas": hora + cliente + servicio + badge estado

**3 Gráficos al fondo (fila):**
- "Servicios más realizados": DonutChart + leyenda
- "Comisiones del mes": BarChart vertical en primary
- "Rendimiento del equipo": Gauge semicircular + %

---

#### PANTALLA 7 — INVENTARIO (ref: `8__Inventario.png`)

**4 KPIs:**
Total Productos | Bajo Stock (Alertas) | Salidas de hoy | Valor Total Inventario

**Tabs:**
`Todos` | `Con Bajo Stock` | `Recientes` | `Consumibles` | `Suministros`
Botón `+ Añadir Nuevo Producto` primary

**Tabla:**
- Columnas: Producto (imagen 40px + nombre) | Categoría | Stock Actual | Stock Mínimo | Última Entrada | Estado (Suficiente/Bajo Stock)

**Panel Detalle Producto:**
- "Detalle del Producto" + ID + badge "Nueva" + ×
- Información General: SKU, Nombre, Descripción
- Estado del Stock: Stock Actual | Stock Mínimo | Stock Óptimo
- Entradas: tabla Fecha | Cantidad | Proveedor
- Salidas: Fecha | Cantidad | Tipo
- Proveedor Principal: Nombre | Contacto | Tiempo de reposición
- Consumo por Servicio: tabla Servicio | Cantidad Promedio
- Alertas de reposición: Umbral + badge "Alerta Activa" rojo
- **3 botones**: "✏ Editar Producto" | "Registrar Entrada" | "Crear Orden de Compra"
- Botón fijo fondo tabla: `+ Añadir Nuevo Producto` outline primary

---

#### PANTALLA 8 — FINANZAS (ref: `9__Finanzas.png`)

**4 KPIs:**
Total Ingresos (Mes) | Total Gastos (Mes) | Utilidad Neta (Mes) | Flujo de Efectivo Disponible

**Tabs:**
`Resumen General` | `Ingresos de Clientes` | `Gastos y Pagos` | `Comisiones y Pagos a Trabajadores`

**Tabla de Transacciones:**
- Columnas: Fecha ↕ | Tipo (badge Ingresos/Descansino) | Descripción | Cliente/Trabajador | Medio de Pago | Monto | Estado | "..."

**Panel Detalle de Transacción:**
- Avatar + nombre + rol + contacto + Tabs: Resumen
- Info: fecha ingreso, rol, comisión %, método de pago
- Medios de Pago: Cash | Tarjeta + montos
- Flujo de Caja Mensual Proyectado: combo chart bar+line

**3 Gráficos (fila):**
- "Evolución Mensual (Ingresos vs Gastos)": BarChart apilado + LineChart (eje dual)
- "Ingresos por Medio de Pago": DonutChart
- "Gastos por Categoría": DonutChart

---

#### PANTALLA 9 — REPORTES Y MÉTRICAS (ref: `10__Reportes_y_Métricas.png`)

**4 KPIs:**
Ventas Totales (Mes) | Ingreso Promedio por Cliente | Tasa de Retención | Ocupación de Sillas (Hoy)

**Tabs Análisis Profundo:**
`Ventas e Ingresos` | `Clientes` | `Servicios y Trabajadores` | `Inventario` | `Rentabilidad`

**Grid 2×2 de Gráficos:**
- "Evolución Mensual (Ventas vs Ingresos)": BarChart apilado + LineChart, eje dual, 10 meses
- "Ventas por Categoría de Servicio": DonutChart
- "Rendimiento de Trabajadores": ScatterChart (ventas vs valor, tamaño = comisión)
- "Flujo de Clientes y Frecuencia": BarChart + HeatMap

**Fila inferior:** "Servicios" (AreaChart), "Inventario + Índice Rotación" (gauge), "Rentabilidad por Servicio" (scatter cuadrantes)

**Tabla "Resumen de Datos":** Reporte | Categoría | Período | Valor | Acción (editar/borrar)

**Botones footer:** "Exportar Reporte Completo" | "Configurar Alertas"

---

#### PANTALLA 10 — IA - ASISTENTE (ref: `11__Asistente_IA.png`)

**4 KPIs:**
Alertas Inteligentes | Oportunidades Detectadas ($) | Recomendaciones Activas | Consultas este Mes

**Layout 2 columnas:**

Col. principal ~70%:
- "Asistente del Dueño (IA)" + botón "Chat consola" outline
- Área de chat:
  - Mensaje usuario: bubble derecha, bg primary, texto white, `border-radius: 18px 18px 4px 18px`
  - Respuesta IA: bubble izquierda, bg #F3F4F6, texto oscuro, avatar IA pequeño, `border-radius: 18px 18px 18px 4px`
- Chips acciones rápidas: "Analizar rentabilidad" | "Estrategia de retención" | "Optimizar inventario" | border #E5E7EB, border-radius 999px
- Input: placeholder + íconos (emoji, adjunto) + botón "Acción" primary derecha

Col. derecha ~30%:
- Card "Detección de Oportunidades & Alertas Inteligentes": lista con ícono+título+subtítulo+flecha →
- Card "Impacto Estimado por Recomendación": BarChart apilado Ene-Dic (puede ser negativo)

---

#### PANTALLA 11 — CONFIGURACIÓN (ref: `12__Configuración.png`)

**Layout 2 columnas:**

Col. principal ~65%:
- Card "Datos del Salón": inputs full-width (Nombre, Dirección, Teléfono, Sitio Web) + zona upload logotipo (cuadrado punteado + botón "Subir Logotipo")
- Fila 2 cards: "Gestión de Usuarios" (botón "Ver Usuarios" outline + total) | "Roles y Permisos" (botón "Ver Roles" outline + total)

Col. derecha ~35%:
- Card "Parámetros del Salón": select moneda + lista métodos de pago con toggles + link "Configuración General" con chevron →
- Card "Integraciones y Notificaciones": WhatsApp Business (badge "Connected" verde) | Email (badge "Active" verde)
- Botón "Guardar Cambios" full-width filled primary (fuera de cards)

---

### 17.6 SIDEBAR — NAVEGACIÓN COMPLETA

```
[Logo 32px]  Nombre Salón
             Salón de Belleza
─────────────────────────────────
🏠  Inicio
📅  1  Solicitudes y Citas    ← badge N si hay nuevas
👤  2  Clientes
✂   3  Servicios
👥  4  Trabajadores
📦  5  Inventario
💰  6  Finanzas
📊  7  Reportes y Métricas
🤖  8  IA - Asistente
⚙   9  Configuración
─────────────────────────────────
[Foto 48px]  Bella Style Salón
             Plan Profesional
             Ver mi plan  ← color primary
─────────────────────────────────
🎧 ¿Necesitas ayuda? / Centro de ayuda
```

**Comportamiento:** El número del módulo es prefijo gris. El ítem activo elimina el prefijo y ocupa el ancho completo con bg primary. Badge de notificación solo en "Solicitudes y Citas".

---

### 17.7 MICRO-INTERACCIONES Y MOTION

```
✅ Hover filas tabla:        bg → --color-primary-soft (transición 150ms)
✅ Panel lateral:            slide desde derecha (200ms ease-out)
✅ Tabs:                     underline deslizable (150ms ease)
✅ Toggles:                  transición suave 200ms
✅ Botón CTA:                scale(0.97) en active (100ms)
✅ Gráficos Recharts:        animación por defecto de Recharts (no desactivar)

❌ NO usar:
   - fade-slide-up en sections al hacer scroll
   - hover transitions en TODAS las cards
   - animaciones de entrada secuencial por sección
   - badges de notificación animados (estáticos)
   - sparklines animadas al cargar
```

---

### 17.8 RESPONSIVE

```
PORTAL CLIENTE:    mobile-first | max-width 430px centrado
                   Grid servicios: 1 col móvil, 2 col tablet
                   Sin sidebar

PANEL GESTIÓN:     Diseñado para desktop (1280px+)
                   1024-1279px: sidebar colapsa a íconos (48px) + tooltip hover
                   < 1024px: responsive básico aceptable (no es el caso de uso principal)

PANEL SUPERADMIN:  Misma estructura que panel de gestión
```

---

### 17.9 LOGO Y MARCA

```
Logo del sistema:   Ícono vectorial flor/corona de 4 pétalos estilizada
                    Color: degradado de rosa #E8375A con acento cálido
                    32×32px en sidebar | 48×48px en portal cliente

Logo en portal QR:  Logo REAL del salón (subido por la dueña via Supabase Storage)
                    No el logo de Oscar's Solution

Footer de cada pantalla del panel:
  "© 2024 [Nombre Salón] Salón de Belleza. Todos los derechos reservados."
  "Versión 2.1.0" alineado a la derecha
  text-xs | color gris muted | border-top 1px #F0F2F5
```

---

## ████  INSTRUCCIÓN INICIAL — EMPEZAR AQUÍ

Empieza por la **FASE 0**.

Antes de escribir código, preséntame el plan detallado:

1. Lista de archivos a crear/modificar
2. Migraciones SQL necesarias
3. Estructura del `seed.sql` de demo (salón en GYD / America/Guyana)
4. Configuración de next-intl para los 6 idiomas
5. Cualquier decisión técnica que debas tomar y quieras confirmar

**Espera mi OK antes de empezar a codear.**

---

*Prompt Maestro v1.0 — Oscar's Solution · Sistema Operativo para Salones de Belleza*
