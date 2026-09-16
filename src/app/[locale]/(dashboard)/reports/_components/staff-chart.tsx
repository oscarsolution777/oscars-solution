"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";

export function StaffChart({ rows }: { rows: StaffWorkloadRow[] }) {
  const data = rows.slice(0, 10);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="assignedCount" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
