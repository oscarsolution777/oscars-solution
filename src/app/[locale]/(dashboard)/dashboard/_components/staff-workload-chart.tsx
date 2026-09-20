"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";

export function StaffWorkloadChart({ staffWorkload }: { staffWorkload: StaffWorkloadRow[] }) {
  const t = useTranslations("dashboard.staffWorkload");
  const data = staffWorkload.slice(0, 5);

  return (
    <ChartCard title={t("title")} isEmpty={data.length === 0} emptyTitle={t("emptyTitle")} height={280}>
      <BarChart data={data} margin={{ left: 8, right: 8, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} width={40} />
        <Tooltip formatter={(value) => t("assignedCount", { count: Number(value) })} />
        <Bar dataKey="assignedCount" fill="var(--color-info)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
