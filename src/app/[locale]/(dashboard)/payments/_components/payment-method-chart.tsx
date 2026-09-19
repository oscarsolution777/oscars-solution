"use client";

import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { CHART_SERIES_COLORS } from "@/lib/utils/chart-colors";
import { formatMoney } from "@/lib/utils/money";
import type { PaymentMethodSlice } from "@/lib/reports/aggregations";

export function PaymentMethodChart({
  slices,
  currency,
  locale,
}: {
  slices: PaymentMethodSlice[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("payments");
  const tMethods = useTranslations("payments.methods");

  const data = slices.map((slice) => ({
    key: slice.method,
    label: tMethods(slice.method),
    value: slice.amountCents,
  }));

  return (
    <ChartCard
      title={t("charts.methodBreakdown.title")}
      isEmpty={data.length === 0}
      emptyTitle={t("charts.methodBreakdown.emptyTitle")}
    >
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}
