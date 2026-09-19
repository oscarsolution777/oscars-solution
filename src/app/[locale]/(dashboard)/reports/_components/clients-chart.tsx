"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClientSegments } from "@/lib/reports/aggregations";

export function ClientsChart({ segments }: { segments: ClientSegments }) {
  const t = useTranslations("reports.clients");
  const data = [
    { label: t("new"), count: segments.newCount },
    { label: t("recurring"), count: segments.recurringCount },
  ];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
