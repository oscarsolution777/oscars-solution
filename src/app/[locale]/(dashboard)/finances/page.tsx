import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listExpenses } from "@/lib/db/expenses";
import { listStaffPayouts } from "@/lib/db/staff-payouts";
import { listPayments } from "@/lib/db/payments";
import { listStaff } from "@/lib/db/staff";
import { listSuppliers } from "@/lib/db/suppliers";
import { EmptyState } from "@/components/shared/empty-state";
import { FinancesView } from "./_components/finances-view";

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

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const incomeCents = payments
    .filter((payment) => payment.status === "paid" && new Date(payment.paid_at) >= startOfMonth)
    .reduce((sum, payment) => sum + payment.amount_cents, 0);

  const expensesCents = expenses
    .filter((expense) => new Date(`${expense.spent_at}T00:00:00`) >= startOfMonth)
    .reduce((sum, expense) => sum + expense.amount_cents, 0);

  const payoutsCents = payouts
    .filter((payout) => payout.status === "paid" && payout.paid_at && new Date(payout.paid_at) >= startOfMonth)
    .reduce((sum, payout) => sum + payout.total_cents, 0);

  const balanceCents = incomeCents - expensesCents - payoutsCents;

  return (
    <FinancesView
      expenses={expenses}
      payouts={payouts}
      staff={staff.filter((member) => member.is_active)}
      suppliers={suppliers.filter((supplier) => supplier.is_active)}
      summary={{ incomeCents, expensesCents, payoutsCents, balanceCents }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
