"use client";

import { Eye, Pencil, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusToggle } from "@/components/shared/status-toggle";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { setProductActiveAction } from "../actions";

type ProductRow = Tables<"products">;

export function ProductsTable({
  products,
  currency,
  locale,
  onView,
  onEdit,
  onCreate,
}: {
  products: ProductRow[];
  currency: string;
  locale: string;
  onView: (product: ProductRow) => void;
  onEdit: (product: ProductRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("inventory.products.table");
  const tUnits = useTranslations("inventory.products.units");

  if (products.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={<Button onClick={onCreate}>{t("createFirst")}</Button>}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnStock")}</TableHead>
            <TableHead>{t("columnCost")}</TableHead>
            <TableHead>{t("columnPrice")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const lowStock = product.stock_qty <= product.min_stock;
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onView(product)}
                    className="text-left"
                  >
                    <span className="block truncate font-medium text-text-primary">
                      {product.name}
                    </span>
                    {product.sku && (
                      <span className="block truncate text-xs text-text-muted">
                        {product.sku}
                      </span>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {lowStock && (
                      <AlertTriangle
                        size={14}
                        className="text-amber-600"
                        aria-label={t("lowStockBadge")}
                      />
                    )}
                    <span className={lowStock ? "font-medium text-amber-600" : "text-text-primary"}>
                      {product.stock_qty} {tUnits(product.unit)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatMoney(product.cost_cents, currency, locale)}
                </TableCell>
                <TableCell className="font-medium text-text-primary">
                  {formatMoney(product.price_cents, currency, locale)}
                </TableCell>
                <TableCell>
                  <StatusToggle
                    id={product.id}
                    name={product.name}
                    isActive={product.is_active}
                    action={setProductActiveAction}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onView(product)}
                      aria-label={t("viewAction")}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(product)}
                      aria-label={t("editAction")}
                    >
                      <Pencil size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
