import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listCashClosures } from "@/lib/db/cash-closures";
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

  const now = new Date();
  const closuresThisMonth = closures.filter((closure) => {
    const closureDate = new Date(`${closure.closure_date}T00:00:00`);
    return closureDate.getFullYear() === now.getFullYear() && closureDate.getMonth() === now.getMonth();
  });

  const accumulatedDifferenceCents = closuresThisMonth.reduce(
    (sum, closure) => sum + closure.difference_cents,
    0
  );

  return (
    <CashClosuresView
      closures={closures}
      kpis={{
        closuresThisMonth: closuresThisMonth.length,
        accumulatedDifferenceCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
