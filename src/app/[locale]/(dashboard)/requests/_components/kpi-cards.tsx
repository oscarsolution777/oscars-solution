import { Inbox, CalendarCheck, UserX, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function KpiCards({
  pendingRequestsCount,
  todayAppointmentsCount,
  noShowRate,
  completedRevenueCents,
  currency,
  locale,
}: {
  pendingRequestsCount: number;
  todayAppointmentsCount: number;
  noShowRate: number;
  completedRevenueCents: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("requests.kpis");

  const items = [
    {
      icon: Inbox,
      iconClass: "bg-amber-100 text-amber-600",
      label: t("pendingRequests"),
      value: pendingRequestsCount,
      caption: t("pendingCaption"),
    },
    {
      icon: CalendarCheck,
      iconClass: "bg-sky-100 text-sky-600",
      label: t("todayAppointments"),
      value: todayAppointmentsCount,
      caption: t("todayCaption"),
    },
    {
      icon: UserX,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("noShowRate"),
      value: `${Math.round(noShowRate * 100)}%`,
      caption: t("thisMonth"),
    },
    {
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("completedRevenue"),
      value: formatMoney(completedRevenueCents, currency, locale),
      caption: t("thisMonth"),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-4">
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
              aria-hidden
            >
              <item.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-text-muted">{item.label}</p>
              <p className="truncate text-xl font-bold text-text-primary">{item.value}</p>
              <p className="truncate text-xs text-text-secondary">{item.caption}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
