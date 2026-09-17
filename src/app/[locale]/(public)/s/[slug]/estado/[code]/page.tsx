import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestStatusByPublicCode } from "@/lib/db/requests";
import { formatMoney } from "@/lib/utils/money";
import { formatCalendarDate } from "@/lib/utils/dates";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
  cancelled: "outline",
  scheduled: "default",
  completed: "default",
  no_show: "destructive",
};

export default async function PublicStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { code } = await params;
  const { new: isNew } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("portal.status");

  const supabase = await createClient();
  const status = await getRequestStatusByPublicCode(supabase, code);

  if (!status) {
    return (
      <div className="p-4">
        <EmptyState title={t("notFoundTitle")} description={t("notFoundDescription")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {isNew === "1" && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-text-primary">
          {t("savedCodeBanner", { code })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{status.salonName}</span>
            <Badge variant={STATUS_VARIANT[status.status] ?? "outline"}>
              {t(`statusLabels.${status.status}` as "statusLabels.pending")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">
            {t("yourCodeLabel")}: <span className="font-mono text-text-primary">{code}</span>
          </p>

          {status.appointment && (
            <p className="text-sm text-text-primary">
              {t("appointmentDateLabel")}:{" "}
              {formatCalendarDate(status.appointment.appointmentDate, locale)}
              {" — "}
              {t(`statusLabels.${status.appointment.status}` as "statusLabels.pending")}
            </p>
          )}

          <div className="flex flex-col gap-1 border-t border-card-border pt-2">
            {status.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">
                  {item.serviceName}
                  {item.staffFullName ? ` · ${item.staffFullName}` : ""}
                </span>
                <span className="text-text-secondary">
                  {formatMoney(item.priceCents, status.currency, locale)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
