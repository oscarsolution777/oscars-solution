"use client";

import { useTranslations } from "next-intl";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";

export function CompletionBreakdownChart({
  completed,
  noShow,
}: {
  completed: number;
  noShow: number;
}) {
  const t = useTranslations("dashboard.completionBreakdown");

  const data = [
    { key: "completed", label: t("completed"), value: completed, color: "var(--color-success)" },
    { key: "noShow", label: t("noShow"), value: noShow, color: "var(--color-danger)" },
  ];
  const isEmpty = completed === 0 && noShow === 0;

  return (
    <ChartCard title={t("title")} isEmpty={isEmpty} emptyTitle={t("emptyTitle")} height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ChartCard>
  );
}
