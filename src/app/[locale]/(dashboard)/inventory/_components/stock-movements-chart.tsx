"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import type { StockMovementPoint } from "@/lib/reports/aggregations";

export function StockMovementsChart({ points }: { points: StockMovementPoint[] }) {
  const t = useTranslations("inventory.charts.stockMovements");
  const isEmpty = points.every((point) => point.inQty === 0 && point.outQty === 0);

  return (
    <ChartCard title={t("title")} isEmpty={isEmpty} emptyTitle={t("emptyTitle")}>
      <BarChart data={points} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} width={40} />
        <Tooltip />
        <Legend />
        <Bar dataKey="inQty" name={t("in")} fill="var(--color-success)" radius={4} />
        <Bar dataKey="outQty" name={t("out")} fill="var(--color-danger)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
