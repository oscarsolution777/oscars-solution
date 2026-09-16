import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";

export async function StaffWorkloadList({ staffWorkload }: { staffWorkload: StaffWorkloadRow[] }) {
  const t = await getTranslations("dashboard.staffWorkload");
  const top = staffWorkload.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyState title={t("emptyTitle")} />
        ) : (
          <ul className="space-y-2">
            {top.map((row) => (
              <li key={row.staffId} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{row.name}</span>
                <span className="text-text-secondary">
                  {t("assignedCount", { count: row.assignedCount })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
