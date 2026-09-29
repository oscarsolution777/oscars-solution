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
import { Pagination } from "@/components/shared/pagination";
import { ProductsValueChart } from "@/components/shared/charts/products-value-chart";
import { formatMoney } from "@/lib/utils/money";
import { usePagination } from "@/lib/utils/pagination";
import type { Tables } from "@/types/database";
import { ExportButtons } from "./export-buttons";

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
  const { page, setPage, totalPages, pageItems } = usePagination(sorted);

  const csvRows = sorted.map((p) => ({
    [t("columnProduct")]: p.name,
    [t("columnStock")]: p.stock_qty,
    [t("columnMinStock")]: p.min_stock,
    [t("columnValue")]: ((p.stock_qty * p.cost_cents) / 100).toFixed(2),
    [t("columnStatus")]: lowStockIds.has(p.id) ? t("lowStockBadge") : t("okBadge"),
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

      <ProductsValueChart
        products={products}
        currency={currency}
        locale={locale}
        title={t("chartTitle")}
        emptyTitle={t("emptyChart")}
      />

      <div className="flex justify-end">
        <ExportButtons
          rows={csvRows}
          baseFilename="inventario"
          tabKey="inventory"
          withPeriod={false}
        />
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
              {pageItems.map((product) => (
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
