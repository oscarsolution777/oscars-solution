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

// Para columnas `date` puras (sin hora: appointment_date, preferred_date,
// closure_date...): NO representan un instante que deba convertirse a la
// zona horaria del salón (a diferencia de formatSalonDate, pensada para
// timestamptz como created_at/paid_at). Un "2026-09-20" es el día calendario
// 2026-09-20 tal cual, en cualquier zona — formatearlo con la zona horaria
// real del salón le resta un día completo si el salón está detrás de UTC
// (ej. America/Guyana, UTC-4: medianoche UTC del día 20 cae la noche del 19).
// Aquí se formatea siempre en "UTC" para mostrar el día tal cual se guardó.
export function formatCalendarDate(
  date: string,
  locale: string,
  pattern = "PPP"
): string {
  const dateFnsLocale =
    DATE_FNS_LOCALES[locale as keyof typeof DATE_FNS_LOCALES] ?? es;
  return formatInTimeZone(new Date(date), "UTC", pattern, { locale: dateFnsLocale });
}
