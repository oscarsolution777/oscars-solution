import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listExpenses } from "@/lib/db/expenses";
import { listStaffPayouts } from "@/lib/db/staff-payouts";
import { listPayments } from "@/lib/db/payments";
import { listStaff } from "@/lib/db/staff";
import { listSuppliers } from "@/lib/db/suppliers";
import { getPresetRange } from "@/lib/utils/period";
import { getStartOfCurrentMonthInTimeZone } from "@/lib/utils/dates";
import { computeExpensesByCategory, computeMonthlyFinanceTrend } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { FinancesView } from "./_components/finances-view";

const MONTHLY_TREND_MONTHS = 6;

export default async function FinancesPage() {
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

  // paid_at es timestamptz: el límite de "este mes" se calcula en la zona
  // horaria del salón, no en la del servidor (CLAUDE.md sección 5,
  // "Fechas") — importante aquí porque son los totales de dinero del mes.
  const startOfMonth = getStartOfCurrentMonthInTimeZone(salon.timezone);
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const currentMonthPrefix = todayStr.slice(0, 7);

  const incomeCents = payments
    .filter((payment) => payment.status === "paid" && new Date(payment.paid_at) >= startOfMonth)
    .reduce((sum, payment) => sum + payment.amount_cents, 0);

  // spent_at es una columna `date` pura (a diferencia de paid_at): se
  // compara como string calendario, nunca como instante convertido a Date.
  const expensesCents = expenses
    .filter((expense) => expense.spent_at.startsWith(currentMonthPrefix))
    .reduce((sum, expense) => sum + expense.amount_cents, 0);

  const payoutsCents = payouts
    .filter((payout) => payout.status === "paid" && payout.paid_at && new Date(payout.paid_at) >= startOfMonth)
    .reduce((sum, payout) => sum + payout.total_cents, 0);

  const balanceCents = incomeCents - expensesCents - payoutsCents;
  const thisMonth = getPresetRange("thisMonth", todayStr);
  const expenseCategories = computeExpensesByCategory(expenses, thisMonth.from, thisMonth.to);
  const monthlyTrend = computeMonthlyFinanceTrend(
    payments,
    expenses,
    payouts,
    MONTHLY_TREND_MONTHS,
    salon.timezone
  );

  return (
    <FinancesView
      expenses={expenses}
      payouts={payouts}
      staff={staff.filter((member) => member.is_active)}
      suppliers={suppliers.filter((supplier) => supplier.is_active)}
      summary={{ incomeCents, expensesCents, payoutsCents, balanceCents }}
      expenseCategories={expenseCategories}
      monthlyTrend={monthlyTrend}
      currency={salon.currency}
      locale={locale}
    />
  );
}
