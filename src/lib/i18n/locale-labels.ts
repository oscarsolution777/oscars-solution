import type { AppLocale } from "./routing";

// Nombres de cada idioma en sí mismo (convención universal de selectores de
// idioma: "Español" nunca se traduce a "Espagnol" en un selector francés).
// Fuente única para los selectores de idioma del proyecto: portal QR
// (idioma del cliente), Configuración (idioma por defecto del portal, y el
// formulario espejo del SuperAdmin al crear/editar un salón) y el selector
// del panel (profiles.locale, CLAUDE.md sección 5) — antes estaba duplicado
// literalmente en los 3 primeros.
export const LOCALE_LABELS: Record<AppLocale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};
