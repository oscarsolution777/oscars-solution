import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listPayments } from "@/lib/db/payments";
import { listClients } from "@/lib/db/clients";
import { getPresetRange, resolvePeriod, type PeriodSearchParams } from "@/lib/utils/period";
import { formatCalendarDate } from "@/lib/utils/dates";
import { computeSalesBuckets, computePaymentMethodBreakdown } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { PaymentsView } from "./_components/payments-view";

export default async function PaymentsPage({
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
  const [payments, clients] = await Promise.all([
    listPayments(supabase, salon.id),
    listClients(supabase, salon.id),
  ]);

  // Punto 4 del bloque de ajustes: los KPIs de dinero (ingresos, promedio,
  // reembolsado) ya no están fijos a "este mes" -- siguen el mismo selector
  // de periodo que Inventario/Solicitudes/Clientes. paid_at es timestamptz,
  // se convierte a la zona horaria del salón antes de comparar (CLAUDE.md
  // sección 5, "Fechas"). "Pendientes" sigue siendo una foto del momento
  // (igual que el resto de contadores "pendiente" del sistema), no se filtra
  // por periodo.
  const params = await searchParams;
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  const paymentsInPeriod = payments.filter((payment) => {
    const paidDate = formatInTimeZone(new Date(payment.paid_at), salon.timezone, "yyyy-MM-dd");
    return paidDate >= from && paidDate <= to;
  });
  const paidInPeriod = paymentsInPeriod.filter((payment) => payment.status === "paid");
  const refundedInPeriod = paymentsInPeriod.filter((payment) => payment.status === "refunded");

  const incomeInPeriodCents = paidInPeriod.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;
  const averagePaymentCents =
    paidInPeriod.length > 0 ? Math.round(incomeInPeriodCents / paidInPeriod.length) : 0;
  const refundedInPeriodCents = refundedInPeriod.reduce(
    (sum, payment) => sum + payment.amount_cents,
    0
  );

  const last3Months = getPresetRange("last3Months", todayStr);
  const incomeTrend = computeSalesBuckets(payments, last3Months.from, last3Months.to, salon.timezone);
  const methodBreakdown = computePaymentMethodBreakdown(payments, from, to);

  const tPeriod = await getTranslations("payments.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <PaymentsView
      payments={payments}
      clients={clients.filter((client) => client.is_active)}
      incomeTrend={incomeTrend}
      methodBreakdown={methodBreakdown}
      period={period}
      periodLabel={periodLabel}
      kpis={{
        incomeInPeriodCents,
        pendingCount,
        averagePaymentCents,
        refundedInPeriodCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
