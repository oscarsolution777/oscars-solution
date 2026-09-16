import { TrendingUp, Receipt, UserX, Scale } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export async function FinancialCards({
  financial,
  currency,
  locale,
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
}) {
  const t = await getTranslations("dashboard.kpis");

  const items = [
    {
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("income"),
      value: formatMoney(financial.incomeCents, currency, locale),
      caption: t("thisMonth"),
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
      caption: t("thisMonth"),
    },
    {
      icon: Scale,
      iconClass: "bg-violet-100 text-violet-600",
      label: t("cashDifference"),
      value: formatMoney(financial.cashDifferenceCents, currency, locale),
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
