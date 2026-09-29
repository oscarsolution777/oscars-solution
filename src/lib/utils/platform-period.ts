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
    return { preset: "week", from: toDateStr(addDaysUtc(now, -6)), to: todayStr };
  }

  if (preset === "month") {
    return { preset: "month", from: toDateStr(addDaysUtc(now, -29)), to: todayStr };
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
