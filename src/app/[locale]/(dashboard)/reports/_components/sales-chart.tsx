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
        <BarChart data={buckets} margin={{ left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={90} />
          <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
          <Bar dataKey="incomeCents" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
