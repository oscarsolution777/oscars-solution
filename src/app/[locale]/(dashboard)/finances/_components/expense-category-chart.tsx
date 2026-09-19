"use client";

import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { CHART_SERIES_COLORS } from "@/lib/utils/chart-colors";
import { formatMoney } from "@/lib/utils/money";
import type { ExpenseCategorySlice } from "@/lib/reports/aggregations";

export function ExpenseCategoryChart({
  slices,
  currency,
  locale,
}: {
  slices: ExpenseCategorySlice[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("finances.charts.expenseCategory");

  // La categoría es texto libre que escribe cada dueña (CLAUDE.md sección 5:
  // el contenido de cada salón no pasa por i18n), así que se muestra tal cual.
  const data = slices.map((slice) => ({
    key: slice.category,
    label: slice.category,
    value: slice.amountCents,
  }));

  return (
    <ChartCard title={t("title")} isEmpty={data.length === 0} emptyTitle={t("emptyTitle")}>
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
