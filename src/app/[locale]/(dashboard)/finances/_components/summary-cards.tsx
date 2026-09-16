import { TrendingUp, TrendingDown, Users, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function SummaryCards({
  incomeCents,
  expensesCents,
  payoutsCents,
  balanceCents,
  currency,
  locale,
}: {
  incomeCents: number;
  expensesCents: number;
  payoutsCents: number;
  balanceCents: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("finances.summary");

  const items = [
    {
      icon: TrendingUp,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("income"),
      value: formatMoney(incomeCents, currency, locale),
      caption: t("thisMonth"),
    },
    {
      icon: TrendingDown,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("expenses"),
      value: formatMoney(expensesCents, currency, locale),
      caption: t("thisMonth"),
    },
    {
      icon: Users,
      iconClass: "bg-violet-100 text-violet-600",
      label: t("payouts"),
      value: formatMoney(payoutsCents, currency, locale),
      caption: t("thisMonth"),
    },
    {
      icon: Scale,
      iconClass:
        balanceCents >= 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600",
      label: t("balance"),
      value: formatMoney(balanceCents, currency, locale),
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
