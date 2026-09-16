import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageSummary } from "@/lib/db/platform-usage";
import { UsageTable } from "./_components/usage-table";

export default async function AdminUsagePage() {
  const locale = await getLocale();
  const t = await getTranslations("superadmin.usage");
  const supabase = await createClient();
  const usage = await getUsageSummary(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t("pageTitle")}</h1>
        <p className="text-sm text-text-secondary">{t("pageSubtitle")}</p>
      </div>
      <UsageTable usage={usage} locale={locale} />
    </div>
  );
}
