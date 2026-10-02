import { CalendarCheck, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function KpiCards({
  closuresInPeriod,
  accumulatedDifferenceCents,
  periodLabel,
  currency,
  locale,
}: {
  closuresInPeriod: number;
  accumulatedDifferenceCents: number;
  periodLabel: string;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("cashClosures.kpis");

  const items = [
    {
      icon: CalendarCheck,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("closuresThisMonth"),
      value: closuresInPeriod,
      caption: periodLabel,
    },
    {
      icon: Scale,
      iconClass:
        accumulatedDifferenceCents === 0
          ? "bg-emerald-100 text-emerald-600"
          : "bg-amber-100 text-amber-600",
      label: t("accumulatedDifference"),
      value: formatMoney(accumulatedDifferenceCents, currency, locale),
      caption: periodLabel,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
