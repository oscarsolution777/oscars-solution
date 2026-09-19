import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listPayments } from "@/lib/db/payments";
import { listClients } from "@/lib/db/clients";
import { getPresetRange } from "@/lib/utils/period";
import { computeSalesBuckets, computePaymentMethodBreakdown } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentsView } from "./_components/payments-view";

export default async function PaymentsPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const [payments, clients] = await Promise.all([
    listPayments(supabase, salon.id),
    listClients(supabase, salon.id),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const paymentsThisMonth = payments.filter((payment) => new Date(payment.paid_at) >= startOfMonth);
  const paidThisMonth = paymentsThisMonth.filter((payment) => payment.status === "paid");
  const refundedThisMonth = paymentsThisMonth.filter((payment) => payment.status === "refunded");

  const monthlyIncomeCents = paidThisMonth.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;
  const averagePaymentCents =
    paidThisMonth.length > 0 ? Math.round(monthlyIncomeCents / paidThisMonth.length) : 0;
  const refundedThisMonthCents = refundedThisMonth.reduce(
    (sum, payment) => sum + payment.amount_cents,
    0
  );

  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const last3Months = getPresetRange("last3Months", todayStr);
  const thisMonth = getPresetRange("thisMonth", todayStr);
  const incomeTrend = computeSalesBuckets(payments, last3Months.from, last3Months.to, salon.timezone);
  const methodBreakdown = computePaymentMethodBreakdown(payments, thisMonth.from, thisMonth.to);

  return (
    <PaymentsView
      payments={payments}
      clients={clients.filter((client) => client.is_active)}
      incomeTrend={incomeTrend}
      methodBreakdown={methodBreakdown}
      kpis={{
        monthlyIncomeCents,
        pendingCount,
        averagePaymentCents,
        refundedThisMonthCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
