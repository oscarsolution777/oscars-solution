// Selector de periodo para Reportes (Fase 8). Vive en la URL (?preset=&from=&to=),
// nunca en estado de cliente (CLAUDE.md sección 2: preferir Server Components +
// URL state). Todo el cálculo es aritmética pura de año/mes/día en UTC — se evita
// date-fns aquí a propósito porque sus funciones usan el reloj local del proceso,
// y solo nos interesan fechas sin hora ya resueltas en la zona horaria del salón.

export type PeriodPreset = "thisMonth" | "lastMonth" | "last3Months" | "custom";

export interface Period {
  from: string; // yyyy-MM-dd, inclusive
  to: string; // yyyy-MM-dd, inclusive
  preset: PeriodPreset;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function monthBounds(year: number, month1to12: number): { from: string; to: string } {
  return {
    from: `${year}-${pad(month1to12)}-01`,
    to: `${year}-${pad(month1to12)}-${pad(lastDayOfMonth(year, month1to12))}`,
  };
}

function addMonthsToYm(year: number, month1to12: number, delta: number) {
  const total = year * 12 + (month1to12 - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function getPresetRange(
  preset: Exclude<PeriodPreset, "custom">,
  todayInSalonTz: string
): { from: string; to: string } {
  const [year, month] = todayInSalonTz.split("-").map(Number);

  if (preset === "lastMonth") {
    const prev = addMonthsToYm(year, month, -1);
    return monthBounds(prev.year, prev.month);
  }

  if (preset === "last3Months") {
    const start = addMonthsToYm(year, month, -2);
    return { from: `${start.year}-${pad(start.month)}-01`, to: todayInSalonTz };
  }

  return monthBounds(year, month);
}

export function resolvePeriod(
  searchParams: { preset?: string; from?: string; to?: string } | undefined,
  todayInSalonTz: string
): Period {
  const requested = searchParams?.preset;

  if (requested === "custom" && searchParams?.from && searchParams?.to) {
    return { from: searchParams.from, to: searchParams.to, preset: "custom" };
  }

  if (requested === "lastMonth" || requested === "last3Months") {
    return { ...getPresetRange(requested, todayInSalonTz), preset: requested };
  }

  return { ...getPresetRange("thisMonth", todayInSalonTz), preset: "thisMonth" };
}
