"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";

export function StaffWorkloadChart({ staffWorkload }: { staffWorkload: StaffWorkloadRow[] }) {
  const t = useTranslations("dashboard.staffWorkload");
  const data = staffWorkload.slice(0, 5);

  return (
    <ChartCard title={t("title")} isEmpty={data.length === 0} emptyTitle={t("emptyTitle")} height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => t("assignedCount", { count: Number(value) })} />
        <Bar dataKey="assignedCount" fill="var(--color-info)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
