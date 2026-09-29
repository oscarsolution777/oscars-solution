"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { CashClosureComparisonPoint } from "@/lib/reports/aggregations";

// Barras agrupadas Esperado vs. Contado por cierre (mismo patrón que
// StockMovementsChart de Inventario) — reemplaza el gráfico de línea de
// diferencia en el tiempo: comparar las dos series directamente es más claro
// que ver solo el número derivado.
export function CashComparisonChart({
  points,
  currency,
  locale,
}: {
  points: CashClosureComparisonPoint[];
  currency: string;
  locale: string;
}) {
  const t = useTranslations("cashClosures.charts.expectedVsCounted");

  return (
    <ChartCard title={t("title")} isEmpty={points.length === 0} emptyTitle={t("emptyTitle")}>
      <BarChart data={points} margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={90} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Legend />
        <Bar dataKey="expectedCashCents" name={t("expected")} fill="var(--color-primary)" radius={4} />
        <Bar dataKey="countedCashCents" name={t("counted")} fill="var(--color-info)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
