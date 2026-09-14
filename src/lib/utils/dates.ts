import { formatInTimeZone } from "date-fns-tz";
import { es, enUS, pt, it, fr, de } from "date-fns/locale";

// Las fechas se guardan en UTC. Se muestran en la zona horaria del salón
// (salons.timezone) y formateadas según el idioma activo (CLAUDE.md
// sección 5, regla "Fechas"). Las citas nunca tienen hora, solo fecha.

const DATE_FNS_LOCALES = { es, en: enUS, pt, it, fr, de } as const;

export function formatSalonDate(
  date: Date | string,
  timezone: string,
  locale: string,
  pattern = "PPP"
): string {
  const dateFnsLocale =
    DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? es;
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, timezone, pattern, { locale: dateFnsLocale });
}
