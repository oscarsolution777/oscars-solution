import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClientSegments } from "@/lib/reports/aggregations";

export async function ClientSegmentsCard({ segments }: { segments: ClientSegments }) {
  const t = await getTranslations("dashboard.clientSegments");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-muted">{t("new")}</p>
          <p className="text-xl font-bold text-text-primary">{segments.newCount}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">{t("recurring")}</p>
          <p className="text-xl font-bold text-text-primary">{segments.recurringCount}</p>
        </div>
      </CardContent>
    </Card>
  );
}
