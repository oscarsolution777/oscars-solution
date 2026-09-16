import { Inbox, CalendarCheck, AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/i18n/navigation";
import type { Tables } from "@/types/database";

type ProductRow = Tables<"products">;

export async function OperationalCards({
  operational,
}: {
  operational: {
    pendingRequestsCount: number;
    todayAppointmentsCount: number;
    lowStockProducts: ProductRow[];
  };
}) {
  const t = await getTranslations("dashboard.kpis");

  const items = [
    {
      icon: Inbox,
      iconClass: "bg-amber-100 text-amber-600",
      label: t("pendingRequests"),
      value: operational.pendingRequestsCount,
      caption: t("pendingCaption"),
      href: "/requests" as const,
    },
    {
      icon: CalendarCheck,
      iconClass: "bg-sky-100 text-sky-600",
      label: t("todayAppointments"),
      value: operational.todayAppointmentsCount,
      caption: t("todayCaption"),
      href: "/requests" as const,
    },
    {
      icon: AlertTriangle,
      iconClass: "bg-rose-100 text-rose-600",
      label: t("lowStock"),
      value: operational.lowStockProducts.length,
      caption: t("lowStockCaption"),
      href: "/inventory" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Link key={item.label} href={item.href}>
          <Card className="transition-colors hover:border-primary">
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
        </Link>
      ))}
    </div>
  );
}
