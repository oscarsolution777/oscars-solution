import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSalonBySlug } from "@/lib/db/salons";
import { listServiceCategories } from "@/lib/db/service-categories";
import { listServices } from "@/lib/db/services";
import { CatalogView } from "./_components/catalog-view";

export default async function PublicCatalogPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const salon = await getSalonBySlug(supabase, slug);
  if (!salon) notFound();

  const [categories, services] = await Promise.all([
    listServiceCategories(supabase, salon.id),
    listServices(supabase, salon.id),
  ]);

  const activeCategories = categories.filter((c) => c.is_active);
  const activeServices = services.filter((s) => s.is_active);

  return (
    <CatalogView
      slug={slug}
      locale={locale}
      currency={salon.currency}
      categories={activeCategories}
      services={activeServices}
    />
  );
}
