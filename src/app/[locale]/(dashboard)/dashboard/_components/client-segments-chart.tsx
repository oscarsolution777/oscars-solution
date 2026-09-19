"use client";

import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { CHART_SERIES_COLORS } from "@/lib/utils/chart-colors";
import type { ClientSegments } from "@/lib/reports/aggregations";

export function ClientSegmentsChart({ segments }: { segments: ClientSegments }) {
  const t = useTranslations("dashboard.clientSegments");

  const data = [
    { key: "new", label: t("new"), value: segments.newCount },
    { key: "recurring", label: t("recurring"), value: segments.recurringCount },
  ];
  const isEmpty = data.every((d) => d.value === 0);

  return (
    <ChartCard title={t("title")} isEmpty={isEmpty} emptyTitle={t("emptyTitle")} height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}
