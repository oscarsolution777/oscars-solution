import { TrendingUp, Receipt, UserX, Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";
import { formatCalendarDate } from "@/lib/utils/dates";
import type { Period } from "@/lib/utils/period";

export async function FinancialCards({
  financial,
  currency,
  locale,
  period,
}: {
  financial: {
    incomeCents: number;
    completedCount: number;
    noShowRate: number;
    avgTicketCents: number;
    cashDifferenceCents: number;
  };
  currency: string;
  locale: string;
  period: Period;
}) {
  const t = await getTranslations("dashboard.kpis");
  const tPeriod = await getTranslations("dashboard.period");

  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  const items = [
    {
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("income"),
      value: formatMoney(financial.incomeCents, currency, locale),
      caption: periodLabel,
    },
    {
      icon: Receipt,
      iconClass: "bg-sky-100 text-sky-600",
      label: t("avgTicket"),
      value: formatMoney(financial.avgTicketCents, currency, locale),
      caption: t("completedCount", { count: financial.completedCount }),
    },
    {
      icon: UserX,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("noShowRate"),
      value: `${Math.round(financial.noShowRate * 100)}%`,
      caption: periodLabel,
    },
    {
      icon: Scale,
      iconClass: "bg-violet-100 text-violet-600",
      label: t("cashDifference"),
      value: formatMoney(financial.cashDifferenceCents, currency, locale),
      caption: periodLabel,
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
