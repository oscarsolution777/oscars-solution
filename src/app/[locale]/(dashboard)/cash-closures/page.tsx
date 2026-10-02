import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listCashClosures } from "@/lib/db/cash-closures";
import { getPresetRange, resolvePeriod, type PeriodSearchParams } from "@/lib/utils/period";
import { getTodayInTimeZone, formatCalendarDate } from "@/lib/utils/dates";
import { computeCashClosureComparison, inRange } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { CashClosuresView } from "./_components/cash-closures-view";

export default async function CashClosuresPage({
  searchParams,
}: {
  searchParams: Promise<PeriodSearchParams>;
}) {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const closures = await listCashClosures(supabase, salon.id);

  // Punto 8 del bloque de ajustes: los 2 KPIs ya no están fijos a "este mes"
  // -- siguen el mismo selector de periodo que el resto de módulos.
  // closure_date es una columna `date` pura (CLAUDE.md sección 5, "Fechas"):
  // se compara como string calendario, nunca convirtiéndola a un `Date` con
  // hora local -- eso desplaza el mes cerca de la medianoche.
  const todayStr = getTodayInTimeZone(salon.timezone);
  const params = await searchParams;
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  const closuresInPeriod = closures.filter((closure) => inRange(closure.closure_date, from, to));

  const accumulatedDifferenceCents = closuresInPeriod.reduce(
    (sum, closure) => sum + closure.difference_cents,
    0
  );

  const last3Months = getPresetRange("last3Months", todayStr);
  const comparisonPoints = computeCashClosureComparison(
    closures,
    last3Months.from,
    last3Months.to
  );

  const tPeriod = await getTranslations("cashClosures.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <CashClosuresView
      closures={closures}
      comparisonPoints={comparisonPoints}
      period={period}
      periodLabel={periodLabel}
      kpis={{
        closuresInPeriod: closuresInPeriod.length,
        accumulatedDifferenceCents,
      }}
      currency={salon.currency}
      locale={locale}
    />
  );
}
