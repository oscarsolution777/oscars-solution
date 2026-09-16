"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/types/database";
import type { Period } from "@/lib/utils/period";
import type {
  SalesBucket,
  ServiceSalesRow,
  StaffWorkloadRow,
  ClientSegments,
} from "@/lib/reports/aggregations";
import { PeriodSelector } from "./period-selector";
import { SalesTab } from "./sales-tab";
import { ClientsTab } from "./clients-tab";
import { ServicesTab } from "./services-tab";
import { StaffTab } from "./staff-tab";
import { InventoryTab } from "./inventory-tab";

type PaymentRow = Tables<"payments">;
type ClientRow = Tables<"clients">;
type ProductRow = Tables<"products">;

export function ReportsView({
  period,
  currency,
  timezone,
  locale,
  sales,
  clients,
  services,
  staff,
  inventory,
}: {
  period: Period;
  currency: string;
  timezone: string;
  locale: string;
  sales: { buckets: SalesBucket[]; payments: PaymentRow[] };
  clients: { segments: ClientSegments; clients: ClientRow[] };
  services: { rows: ServiceSalesRow[] };
  staff: { rows: StaffWorkloadRow[] };
  inventory: { products: ProductRow[]; lowStockProducts: ProductRow[]; inventoryValueCents: number };
}) {
  const t = useTranslations("reports");
  const [tab, setTab] = useState<"sales" | "clients" | "services" | "staff" | "inventory">("sales");

  const clientsById = useMemo(
    () => new Map(clients.clients.map((c) => [c.id, c])),
    [clients.clients]
  );

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="sales">{t("tabs.sales")}</TabsTrigger>
            <TabsTrigger value="clients">{t("tabs.clients")}</TabsTrigger>
            <TabsTrigger value="services">{t("tabs.services")}</TabsTrigger>
            <TabsTrigger value="staff">{t("tabs.staff")}</TabsTrigger>
            <TabsTrigger value="inventory">{t("tabs.inventory")}</TabsTrigger>
          </TabsList>

          {tab !== "inventory" && <PeriodSelector period={period} />}
        </div>

        <TabsContent value="sales">
          <SalesTab
            buckets={sales.buckets}
            payments={sales.payments}
            clientsById={clientsById}
            currency={currency}
            timezone={timezone}
            locale={locale}
          />
        </TabsContent>

        <TabsContent value="clients">
          <ClientsTab
            segments={clients.segments}
            clients={clients.clients}
            currency={currency}
            timezone={timezone}
            locale={locale}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab rows={services.rows} currency={currency} locale={locale} />
        </TabsContent>

        <TabsContent value="staff">
          <StaffTab rows={staff.rows} currency={currency} locale={locale} />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryTab
            products={inventory.products}
            lowStockProducts={inventory.lowStockProducts}
            inventoryValueCents={inventory.inventoryValueCents}
            currency={currency}
            locale={locale}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
