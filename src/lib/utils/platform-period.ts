// Selector de fechas del Panel SuperAdmin -> Uso (cross-tenant: salones en
// distintas zonas horarias). A diferencia de src/lib/utils/period.ts (que
// exige "todayInSalonTz", la fecha de hoy en la zona horaria de UN salón
// concreto, CLAUDE.md sección 5), aquí no existe una sola zona horaria
// correcta — los límites se resuelven en UTC en el propio servidor. Es una
// vista aproximada de actividad agregada, no un dato financiero por salón.

export type PlatformUsagePreset = "all" | "today" | "yesterday" | "week" | "month" | "custom";

export interface PlatformUsagePeriod {
  preset: PlatformUsagePreset;
  from: string | null; // yyyy-MM-dd (UTC), inclusive; null = sin límite inferior
  to: string | null; // yyyy-MM-dd (UTC), inclusive; null = sin límite superior
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateStr(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDaysUtc(date: Date, delta: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + delta);
  return copy;
}

// Punto 20 del bloque de ajustes: "week"/"month" dejan de ser una ventana
// móvil de 7/30 días terminando hoy -- pasan a ser semana y mes calendario
// completos, mismo criterio que el resto de la app (period.ts "thisMonth" =
// mes calendario completo; mondayOf() en aggregations.ts para el lunes ISO
// de una semana). Así la etiqueta nueva ("Última semana"/"Último mes") y
// los datos que muestra coinciden, que es justo lo que pidió Oscar -- antes
// cambiar solo la etiqueta sin la lógica hubiera prometido algo distinto a
// lo que realmente se muestra.
function mondayOfWeekUtc(date: Date): Date {
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  return addDaysUtc(date, diff);
}

function lastDayOfMonthUtc(year: number, month0to11: number): number {
  return new Date(Date.UTC(year, month0to11 + 1, 0)).getUTCDate();
}

export function resolvePlatformUsagePeriod(
  searchParams: { preset?: string; from?: string; to?: string } | undefined
): PlatformUsagePeriod {
  const preset = searchParams?.preset;
  const now = new Date();
  const todayStr = toDateStr(now);

  if (preset === "custom" && searchParams?.from && searchParams?.to) {
    return { preset: "custom", from: searchParams.from, to: searchParams.to };
  }

  if (preset === "today") {
    return { preset: "today", from: todayStr, to: todayStr };
  }

  if (preset === "yesterday") {
    const yesterday = toDateStr(addDaysUtc(now, -1));
    return { preset: "yesterday", from: yesterday, to: yesterday };
  }

  if (preset === "week") {
    const monday = mondayOfWeekUtc(now);
    return {
      preset: "week",
      from: toDateStr(monday),
      to: toDateStr(addDaysUtc(monday, 6)),
    };
  }

  if (preset === "month") {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    return {
      preset: "month",
      from: toDateStr(new Date(Date.UTC(year, month, 1))),
      to: toDateStr(new Date(Date.UTC(year, month, lastDayOfMonthUtc(year, month)))),
    };
  }

  // "all": totales acumulados desde siempre, mismo comportamiento que antes
  // de que existiera este selector.
  return { preset: "all", from: null, to: null };
}

// Convierte un límite yyyy-MM-dd (inclusive) a los timestamptz que espera
// platform_usage_summary(): inicio del día para "from", fin del día para "to".
export function toUsageRangeTimestamps(period: PlatformUsagePeriod): {
  from: string | null;
  to: string | null;
} {
  return {
    from: period.from ? `${period.from}T00:00:00.000Z` : null,
    to: period.to ? `${period.to}T23:59:59.999Z` : null,
  };
}
