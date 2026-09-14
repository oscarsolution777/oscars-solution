# Nota — Rate limiting del portal público (decidir en Fase 2)

No implementado en la Fase 0. Cuando se construya el portal QR (`/s/[slug]`,
Fase 2), el endpoint de creación de `requests` y la búsqueda por
`public_code` necesitan rate limiting (CLAUDE.md sección 7, regla 7):

- Opción A: tabla ligera propia (`ip` o `public_code` + ventana de tiempo),
  sin dependencias nuevas.
- Opción B: servicio externo tipo Upstash Ratelimit.

Decidir al llegar a la Fase 2, no antes.
