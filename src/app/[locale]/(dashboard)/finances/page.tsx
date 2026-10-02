import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listExpenses } from "@/lib/db/expenses";
import { listStaffPayouts } from "@/lib/db/staff-payouts";
import { listPayments } from "@/lib/db/payments";
import { listStaff } from "@/lib/db/staff";
import { listSuppliers } from "@/lib/db/suppliers";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/utils/period";
import { formatCalendarDate } from "@/lib/utils/dates";
import { computeExpensesByCategory, computeMonthlyFinanceTrend, inRange } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { FinancesView } from "./_components/finances-view";

const MONTHLY_TREND_MONTHS = 6;

export default async function FinancesPage({
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

  // CLAUDE.md sección 7: "Finanzas / Nóminas" es owner ✅, admin ❌, reception
  // ❌ — sin acceso alguno, no solo lectura. A diferencia de "Trabajadores"
  // (reception ve una versión de solo lectura), aquí se bloquea la página
  // entera. Reforzado también por RLS (has_role_in_salon(['owner'])) y por
  // requireFinancesAccess() en actions.ts (doble capa, sección 7).
  if (session.activeMembership.role !== "owner") {
    const t = await getTranslations("finances");
    return <EmptyState title={t("errors.forbiddenTitle")} description={t("errors.forbidden")} />;
  }

  const supabase = await createClient();
  const [expenses, payouts, payments, staff, suppliers] = await Promise.all([
    listExpenses(supabase, salon.id),
    listStaffPayouts(supabase, salon.id),
    listPayments(supabase, salon.id),
    listStaff(supabase, salon.id),
    listSuppliers(supabase, salon.id),
  ]);

  // Punto 9 del bloque de ajustes: el resumen (tarjetas + gráfico circular de
  // gastos) ya no está fijo a "este mes" -- sigue el mismo selector de
  // periodo que el resto de módulos. La tendencia mensual (MonthlyTrendChart,
  // MONTHLY_TREND_MONTHS fija) se deja igual a propósito: es un gráfico de
  // tendencia multi-mes por diseño, no una foto de un solo periodo. paid_at
  // es timestamptz: se convierte a la zona horaria del salón antes de
  // comparar (CLAUDE.md sección 5, "Fechas"); spent_at es una columna `date`
  // pura, se compara como string calendario.
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const params = await searchParams;
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  const incomeCents = payments
    .filter(
      (payment) =>
        payment.status === "paid" &&
        inRange(formatInTimeZone(new Date(payment.paid_at), salon.timezone, "yyyy-MM-dd"), from, to)
    )
    .reduce((sum, payment) => sum + payment.amount_cents, 0);

  const expensesCents = expenses
    .filter((expense) => inRange(expense.spent_at, from, to))
    .reduce((sum, expense) => sum + expense.amount_cents, 0);

  const payoutsCents = payouts
    .filter(
      (payout) =>
        payout.status === "paid" &&
        payout.paid_at &&
        inRange(formatInTimeZone(new Date(payout.paid_at), salon.timezone, "yyyy-MM-dd"), from, to)
    )
    .reduce((sum, payout) => sum + payout.total_cents, 0);

  const balanceCents = incomeCents - expensesCents - payoutsCents;
  const expenseCategories = computeExpensesByCategory(expenses, from, to);
  const monthlyTrend = computeMonthlyFinanceTrend(
    payments,
    expenses,
    payouts,
    MONTHLY_TREND_MONTHS,
    salon.timezone
  );

  const tPeriod = await getTranslations("finances.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <FinancesView
      expenses={expenses}
      payouts={payouts}
      staff={staff.filter((member) => member.is_active)}
      suppliers={suppliers.filter((supplier) => supplier.is_active)}
      period={period}
      periodLabel={periodLabel}
      summary={{ incomeCents, expensesCents, payoutsCents, balanceCents }}
      expenseCategories={expenseCategories}
      monthlyTrend={monthlyTrend}
      currency={salon.currency}
      locale={locale}
    />
  );
}
