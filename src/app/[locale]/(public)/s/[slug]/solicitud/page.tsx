import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSalonBySlug } from "@/lib/db/salons";
import { listServices } from "@/lib/db/services";
import { listPublicStaffForSalon } from "@/lib/db/public-staff";
import { EmptyState } from "@/components/shared/empty-state";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { RequestForm } from "./_components/request-form";

export default async function PublicSolicitudPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ items?: string }>;
}) {
  const { slug } = await params;
  const { items } = await searchParams;
  const locale = await getLocale();
  const supabase = await createClient();

  const salon = await getSalonBySlug(supabase, slug);
  if (!salon) notFound();

  // Nunca se confía en lo que llegó en la URL: se revalida cada serviceId
  // contra los servicios activos reales del salón (CLAUDE.md sección 7.6).
  const requestedIds = (items ?? "").split(",").filter(Boolean);
  const services = await listServices(supabase, salon.id);
  const activeServicesById = new Map(
    services.filter((s) => s.is_active).map((s) => [s.id, s])
  );
  const selectedServices = requestedIds
    .map((id) => activeServicesById.get(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (selectedServices.length === 0) {
    const t = await getTranslations("portal.form");
    return (
      <div className="p-4">
        <EmptyState
          title={t("emptySelectionTitle")}
          description={t("emptySelectionDescription")}
          action={
            <Button size="sm" render={<Link href={`/s/${slug}`} />}>
              {t("backToCatalog")}
            </Button>
          }
        />
      </div>
    );
  }

  const staff = await listPublicStaffForSalon(supabase, salon.id);

  return (
    <RequestForm
      slug={slug}
      locale={locale}
      currency={salon.currency}
      services={selectedServices}
      staff={staff}
    />
  );
}
