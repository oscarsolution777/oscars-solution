"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/utils/money";
import type { SalesBucket } from "@/lib/reports/aggregations";

export function SalesChart({
  buckets,
  currency,
  locale,
}: {
  buckets: SalesBucket[];
  currency: string;
  locale: string;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(value) => formatMoney(value, currency, locale)} />
          <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
          <Bar dataKey="incomeCents" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
