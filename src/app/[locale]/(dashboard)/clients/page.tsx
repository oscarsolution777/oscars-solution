import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/db/clients";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/utils/period";
import { formatCalendarDate } from "@/lib/utils/dates";
import { EmptyState } from "@/components/shared/empty-state";
import { ClientsView } from "./_components/clients-view";

export default async function ClientsPage({
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
  const clients = await listClients(supabase, salon.id);

  const activeClients = clients.filter((client) => client.is_active);

  // Punto 2 del bloque de ajustes: antes "nuevos" estaba fijo a "este mes" --
  // ahora sigue el mismo selector de periodo ya usado en Inventario/
  // Solicitudes (CLAUDE.md sección 11). created_at es timestamptz, se
  // convierte a la zona horaria del salón antes de comparar (sección 5,
  // "Fechas").
  const params = await searchParams;
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  const newInPeriod = activeClients.filter((client) => {
    const createdDate = formatInTimeZone(new Date(client.created_at), salon.timezone, "yyyy-MM-dd");
    return createdDate >= from && createdDate <= to;
  }).length;
  const withHistory = activeClients.filter((client) => client.last_visit_at !== null).length;
  const totalSpentCents = activeClients.reduce(
    (sum, client) => sum + client.total_spent_cents,
    0
  );

  const tPeriod = await getTranslations("clients.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <ClientsView
      clients={clients}
      period={period}
      periodLabel={periodLabel}
      kpis={{
        total: activeClients.length,
        newInPeriod,
        withHistory,
        totalSpentCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
