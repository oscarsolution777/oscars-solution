import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageSummary } from "@/lib/db/platform-usage";
import { resolvePlatformUsagePeriod, toUsageRangeTimestamps } from "@/lib/utils/platform-period";
import { UsagePeriodSelector } from "./_components/usage-period-selector";
import { UsageTable } from "./_components/usage-table";

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("superadmin.usage");
  const params = await searchParams;
  const period = resolvePlatformUsagePeriod(params);
  const supabase = await createClient();
  const usage = await getUsageSummary(supabase, toUsageRangeTimestamps(period));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{t("pageTitle")}</h1>
          <p className="text-sm text-text-secondary">{t("pageSubtitle")}</p>
        </div>
        <UsagePeriodSelector period={period} />
      </div>
      <UsageTable usage={usage} locale={locale} />
    </div>
  );
}
