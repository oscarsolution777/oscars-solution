import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listCashClosures } from "@/lib/db/cash-closures";
import { getPresetRange } from "@/lib/utils/period";
import { getTodayInTimeZone } from "@/lib/utils/dates";
import { computeCashDifferenceTrend } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { CashClosuresView } from "./_components/cash-closures-view";

export default async function CashClosuresPage() {
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

  // closure_date es una columna `date` pura (CLAUDE.md sección 5, "Fechas"):
  // se compara como string calendario, nunca convirtiéndola a un `Date` con
  // hora local — eso desplaza el mes cerca de la medianoche.
  const todayStr = getTodayInTimeZone(salon.timezone);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const closuresThisMonth = closures.filter((closure) =>
    closure.closure_date.startsWith(currentMonthPrefix)
  );

  const accumulatedDifferenceCents = closuresThisMonth.reduce(
    (sum, closure) => sum + closure.difference_cents,
    0
  );

  const { from, to } = getPresetRange("last3Months", todayStr);
  const differenceTrend = computeCashDifferenceTrend(closures, from, to);

  return (
    <CashClosuresView
      closures={closures}
      differenceTrend={differenceTrend}
      kpis={{
        closuresThisMonth: closuresThisMonth.length,
        accumulatedDifferenceCents,
      }}
      currency={salon.currency}
      locale={locale}
    />
  );
}
