"use client";

import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_SERIES_COLORS } from "@/lib/utils/chart-colors";
import type { ClientSegments } from "@/lib/reports/aggregations";

// Punto 12 del bloque de ajustes: con solo 2 datos (nuevos/recurrentes), un
// gráfico de barras se veía pobre -- se cambia a circular, mismo patrón ya
// usado en Pagos (PaymentMethodChart) y Finanzas (ExpenseCategoryChart).
export function ClientsChart({ segments }: { segments: ClientSegments }) {
  const t = useTranslations("reports.clients");
  const data = [
    { key: "new", label: t("new"), count: segments.newCount },
    { key: "recurring", label: t("recurring"), count: segments.recurringCount },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.key} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, t("countLabel")]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
