import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard");

  const salon = session.activeMembership?.salon;

  if (!salon) {
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("salonInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-text-secondary">{salon.name}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">{t("currency")}</p>
            <p className="text-sm font-semibold text-text-primary">
              {salon.currency}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">{t("timezone")}</p>
            <p className="text-sm font-semibold text-text-primary">
              {salon.timezone}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
