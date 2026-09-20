"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import type { ServiceSalesRow } from "@/lib/reports/aggregations";

export function TopServicesChart({
  services,
  currency,
  locale,
}: {
  services: ServiceSalesRow[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.topServices");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <EmptyState title={t("emptyTitle")} />
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={services} margin={{ left: 8, right: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={70} />
                <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />

                <Bar dataKey="revenueCents" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
