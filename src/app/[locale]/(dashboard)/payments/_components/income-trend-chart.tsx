"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { SalesBucket } from "@/lib/reports/aggregations";

export function IncomeTrendChart({
  buckets,
  currency,
  locale,
}: {
  buckets: SalesBucket[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("payments.charts.incomeTrend");

  return (
    <ChartCard title={t("title")} isEmpty={buckets.length === 0} emptyTitle={t("emptyTitle")}>
      <BarChart data={buckets} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => formatMoney(value, currency, locale)} />
        <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Bar dataKey="incomeCents" fill="var(--color-primary)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
