"use client";

import { useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
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
      <AreaChart data={buckets} margin={{ left: 8, right: 8 }}>
        <defs>
          <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={90} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Area
          type="monotone"
          dataKey="incomeCents"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#revenueTrendFill)"
        />
      </AreaChart>
    </ChartCard>
  );
}
