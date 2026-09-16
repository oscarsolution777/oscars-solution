import { Package, AlertTriangle, Wallet, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils/money";

export function KpiCards({
  totalProducts,
  lowStockCount,
  inventoryValueCents,
  movementsThisMonth,
  currency,
  locale,
}: {
  totalProducts: number;
  lowStockCount: number;
  inventoryValueCents: number;
  movementsThisMonth: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("inventory.kpis");

  const items = [
    {
      icon: Package,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("totalProducts"),
      value: totalProducts,
      caption: t("active"),
    },
    {
      icon: AlertTriangle,
      iconClass: "bg-amber-100 text-amber-600",
      label: t("lowStock"),
      value: lowStockCount,
      caption: t("lowStockCaption"),
    },
    {
      icon: Wallet,
      iconClass: "bg-emerald-100 text-emerald-600",
      label: t("inventoryValue"),
      value: formatMoney(inventoryValueCents, currency, locale),
      caption: t("inventoryValueCaption"),
    },
    {
      icon: ArrowLeftRight,
      iconClass: "bg-violet-100 text-violet-600",
      label: t("movementsThisMonth"),
      value: movementsThisMonth,
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
