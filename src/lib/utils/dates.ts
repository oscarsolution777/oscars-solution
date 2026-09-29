import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
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

// "Hoy" como string calendario ("yyyy-MM-dd") en la zona horaria del salón.
// Punto único para que ninguna página vuelva a calcular "hoy" con `new
// Date()` a secas, que usa la zona horaria del proceso de Node (UTC en
// Vercel) en vez de la del salón.
export function getTodayInTimeZone(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

// Instante UTC de la medianoche del día 1 del mes actual, en la zona
// horaria del salón — para filtrar columnas timestamptz ("¿esto es de este
// mes?": created_at, paid_at...). Nunca usar `new Date()` + `setDate(1)`: esa
// operación usa la zona horaria del proceso de Node, no la del salón, y
// desplaza el límite del mes varias horas en salones detrás de UTC (ej.
// America/Guyana, UTC-4) — mismo bug de fondo que ya documentaba
// formatCalendarDate para columnas `date` puras, aplicado aquí a instantes.
export function getStartOfCurrentMonthInTimeZone(timezone: string): Date {
  const todayStr = getTodayInTimeZone(timezone);
  const firstOfMonth = `${todayStr.slice(0, 7)}-01T00:00:00`;
  return fromZonedTime(firstOfMonth, timezone);
}
