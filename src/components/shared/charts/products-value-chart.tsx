"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/shared/chart-card";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";

type ProductRow = Tables<"products">;

// Compartido entre Inventario y la pestaña "Inventario" de Reportes (mismo
// cálculo de valor por producto, dos contextos distintos) — recibe
// title/emptyTitle como props en vez de fijar un namespace de i18n interno
// para poder reutilizarse en ambos.
export function ProductsValueChart({
  products,
  currency,
  locale,
  title,
  emptyTitle,
}: {
  products: ProductRow[];
  currency: string;
  locale: string;
  title: string;
  emptyTitle: string;
}) {
  const data = [...products]
    .map((product) => ({ name: product.name, valueCents: product.stock_qty * product.cost_cents }))
    .sort((a, b) => b.valueCents - a.valueCents)
    .slice(0, 8);

  return (
    <ChartCard title={title} isEmpty={data.length === 0} emptyTitle={emptyTitle}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => formatMoney(value, currency, locale)} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatMoney(Number(value), currency, locale)} />
        <Bar dataKey="valueCents" fill="var(--color-primary)" radius={4} />
      </BarChart>
    </ChartCard>
  );
}
