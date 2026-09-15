import { UsersRound, UserPlus, Scissors, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function KpiCards({
  total,
  newThisMonth,
  servicesCovered,
  totalActiveServices,
  monthlyPayrollCents,
  currency,
  locale,
}: {
  total: number;
  newThisMonth: number;
  servicesCovered: number;
  totalActiveServices: number;
  monthlyPayrollCents: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("staff.kpis");

  const items = [
    {
      icon: UsersRound,
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
      icon: Scissors,
      iconClass: "bg-amber-100 text-amber-600",
      label: t("servicesCovered"),
      value: `${servicesCovered}/${totalActiveServices}`,
      caption: t("ofTotalServices"),
    },
    {
      icon: Wallet,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("monthlyPayroll"),
      value: formatMoney(monthlyPayrollCents, currency, locale),
      caption: t("baseSalariesSum"),
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
