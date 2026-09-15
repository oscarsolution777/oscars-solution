import { Users, UserPlus, History, CircleDollarSign } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function KpiCards({
  total,
  newThisMonth,
  withHistory,
  totalSpentCents,
  currency,
  locale,
}: {
  total: number;
  newThisMonth: number;
  withHistory: number;
  totalSpentCents: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("clients.kpis");

  const items = [
    {
      icon: Users,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("total"),
      value: total,
      caption: t("active"),
    },
    {
      icon: UserPlus,
      iconClass: "bg-violet-100 text-violet-600",
      label: t("newThisMonth"),
      value: newThisMonth,
      caption: t("thisMonth"),
    },
    {
      icon: History,
      iconClass: "bg-amber-100 text-amber-600",
      label: t("withHistory"),
      value: withHistory,
      caption: t("sinceFirstVisit"),
    },
    {
      icon: CircleDollarSign,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("totalSpent"),
      value: formatMoney(totalSpentCents, currency, locale),
      caption: t("allClients"),
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
              <p className="truncate text-xl font-bold text-text-primary">
                {item.value}
              </p>
              <p className="truncate text-xs text-text-secondary">{item.caption}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
