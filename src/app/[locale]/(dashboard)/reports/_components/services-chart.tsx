"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils/money";
import type { ServiceSalesRow } from "@/lib/reports/aggregations";

export function ServicesChart({
  rows,
  currency,
  locale,
}: {
  rows: ServiceSalesRow[];
  currency: string;
  locale: string;
}) {
  const data = rows.slice(0, 10);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => formatMoney(value, currency, locale)} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
          <Bar dataKey="revenueCents" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
