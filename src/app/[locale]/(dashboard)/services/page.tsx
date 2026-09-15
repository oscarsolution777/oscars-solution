import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listServiceCategories } from "@/lib/db/service-categories";
import { listServices } from "@/lib/db/services";
import { EmptyState } from "@/components/shared/empty-state";
import { ServicesView } from "./_components/services-view";

export default async function ServicesPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const [categories, services] = await Promise.all([
    listServiceCategories(supabase, salon.id),
    listServices(supabase, salon.id),
  ]);

  const activeServices = services.filter((service) => service.is_active);
  const activeCategories = categories.filter((category) => category.is_active);

  const avgPriceCents =
    activeServices.length > 0
      ? Math.round(
          activeServices.reduce((sum, service) => sum + service.price_cents, 0) /
            activeServices.length
        )
      : 0;

  const avgDurationMin =
    activeServices.length > 0
      ? Math.round(
          activeServices.reduce((sum, service) => sum + service.duration_min, 0) /
            activeServices.length
        )
      : 0;

  return (
    <ServicesView
      categories={categories}
      services={services}
      kpis={{
        totalServices: activeServices.length,
        totalCategories: activeCategories.length,
        avgPriceCents,
        avgDurationMin,
      }}
      currency={salon.currency}
      locale={locale}
      role={session.activeMembership.role}
    />
  );
}
