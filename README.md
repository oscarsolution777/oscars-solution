# Oscar's Solution — Sistema Operativo para Salones de Belleza

Ver `CLAUDE.md` para el contexto de producto, stack, modelo de datos y reglas
de trabajo completas. Este README solo cubre cómo levantar el entorno local.

## Requisitos

- Node.js LTS
- Docker Desktop (para Supabase local)
- Supabase CLI (`npx supabase ...`, no requiere instalación global)

## Primer arranque

```bash
npm install
cp .env.example .env.local   # completar tras el paso siguiente
npx supabase start           # imprime URL/anon key/service role key
# copiar esos valores a .env.local
npm run db:reset             # aplica migraciones + seed + usuario demo
npm run db:types
npm run dev
```

Login de desarrollo: `owner@salonpiloto.demo` / valor de `SEED_DEMO_PASSWORD`
en `.env.local` (por defecto `ChangeMe123!`).

## Comandos

Ver la tabla completa en `CLAUDE.md` sección 4.
