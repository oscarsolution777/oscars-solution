"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { FinanceMonthPoint } from "@/lib/reports/aggregations";

export function MonthlyTrendChart({
  points,
  currency,
  locale,
}: {
  points: FinanceMonthPoint[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("finances");
  const isEmpty = points.every(
    (point) => point.incomeCents === 0 && point.expensesCents === 0 && point.payoutsCents === 0
  );

  return (
    <ChartCard
      title={t("charts.monthlyTrend.title")}
      isEmpty={isEmpty}
      emptyTitle={t("charts.monthlyTrend.emptyTitle")}
      height={300}
    >
      <BarChart data={points} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => formatMoney(value, currency, locale)} />
        <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Legend />
        <Bar dataKey="incomeCents" name={t("summary.income")} fill="var(--color-success)" radius={4} />
        <Bar dataKey="expensesCents" name={t("summary.expenses")} fill="var(--color-danger)" radius={4} />
        <Bar dataKey="payoutsCents" name={t("summary.payouts")} fill="var(--color-info)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
