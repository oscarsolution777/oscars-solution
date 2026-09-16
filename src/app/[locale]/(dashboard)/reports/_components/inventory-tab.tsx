"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { ExportCsvButton } from "./export-csv-button";

type ProductRow = Tables<"products">;

export function InventoryTab({
  products,
  lowStockProducts,
  inventoryValueCents,
  currency,
  locale,
}: {
  products: ProductRow[];
  lowStockProducts: ProductRow[];
  inventoryValueCents: number;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("reports.inventory");

  const lowStockIds = new Set(lowStockProducts.map((p) => p.id));
  const sorted = [...products].sort((a, b) => a.stock_qty - b.stock_qty);

  const csvRows = sorted.map((p) => ({
    producto: p.name,
    stock: p.stock_qty,
    minimo: p.min_stock,
    valor: ((p.stock_qty * p.cost_cents) / 100).toFixed(2),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("totalValue")}</p>
            <p className="text-xl font-bold text-text-primary">
              {formatMoney(inventoryValueCents, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-text-muted">{t("lowStockCount")}</p>
            <p className="text-xl font-bold text-text-primary">{lowStockProducts.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportCsvButton rows={csvRows} filename="inventario.csv" />
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={t("emptyTable")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnProduct")}</TableHead>
                <TableHead>{t("columnStock")}</TableHead>
                <TableHead>{t("columnMinStock")}</TableHead>
                <TableHead>{t("columnValue")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-text-primary">{product.name}</TableCell>
                  <TableCell className="text-text-secondary">{product.stock_qty}</TableCell>
                  <TableCell className="text-text-secondary">{product.min_stock}</TableCell>
                  <TableCell className="text-text-primary">
                    {formatMoney(product.stock_qty * product.cost_cents, currency, locale)}
                  </TableCell>
                  <TableCell>
                    {lowStockIds.has(product.id) ? (
                      <Badge variant="destructive">{t("lowStockBadge")}</Badge>
                    ) : (
                      <Badge variant="outline">{t("okBadge")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
