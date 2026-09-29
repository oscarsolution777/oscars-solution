import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/db/clients";
import { getStartOfCurrentMonthInTimeZone } from "@/lib/utils/dates";
import { EmptyState } from "@/components/shared/empty-state";
import { ClientsView } from "./_components/clients-view";

export default async function ClientsPage() {
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
  // created_at es timestamptz: el límite de "este mes" se calcula en la zona
  // horaria del salón, no en la del servidor (CLAUDE.md sección 5, "Fechas").
  const startOfMonth = getStartOfCurrentMonthInTimeZone(salon.timezone);

  const newThisMonth = activeClients.filter(
    (client) => new Date(client.created_at) >= startOfMonth
  ).length;
  const withHistory = activeClients.filter((client) => client.last_visit_at !== null).length;
  const totalSpentCents = activeClients.reduce(
    (sum, client) => sum + client.total_spent_cents,
    0
  );

  return (
    <ClientsView
      clients={clients}
      kpis={{
        total: activeClients.length,
        newThisMonth,
        withHistory,
        totalSpentCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
