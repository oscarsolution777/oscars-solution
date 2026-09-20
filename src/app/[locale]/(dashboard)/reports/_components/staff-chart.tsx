"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StaffWorkloadRow } from "@/lib/reports/aggregations";

export function StaffChart({ rows }: { rows: StaffWorkloadRow[] }) {
  const data = rows.slice(0, 10);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
          <YAxis allowDecimals={false} width={40} />
          <Tooltip />
          <Bar dataKey="assignedCount" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
