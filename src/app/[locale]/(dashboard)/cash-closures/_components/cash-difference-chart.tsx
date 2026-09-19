"use client";

import { useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { CashDifferencePoint } from "@/lib/reports/aggregations";

export function CashDifferenceChart({
  points,
  currency,
  locale,
}: {
  points: CashDifferencePoint[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("cashClosures.charts.differenceTrend");

  return (
    <ChartCard title={t("title")} isEmpty={points.length === 0} emptyTitle={t("emptyTitle")}>
      <LineChart data={points} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={90} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <ReferenceLine y={0} stroke="var(--color-card-border)" />
        <Line
          type="monotone"
          dataKey="differenceCents"
          stroke="var(--color-warning)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartCard>
  );
}
