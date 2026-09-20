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
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={80} />
          <YAxis tickFormatter={(value) => formatMoney(value, currency, locale)} width={70} />
          <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
          <Bar dataKey="revenueCents" fill="var(--color-primary)" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
