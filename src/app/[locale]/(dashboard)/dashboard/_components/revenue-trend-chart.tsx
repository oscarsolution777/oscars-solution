"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { SalesBucket } from "@/lib/reports/aggregations";

export function RevenueTrendChart({
  buckets,
  currency,
  locale,
}: {
  buckets: SalesBucket[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("dashboard.revenueTrend");

  return (
    <ChartCard title={t("title")} isEmpty={buckets.length === 0} emptyTitle={t("emptyTitle")}>
      <BarChart data={buckets} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={90} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Bar dataKey="incomeCents" fill="var(--color-primary)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
