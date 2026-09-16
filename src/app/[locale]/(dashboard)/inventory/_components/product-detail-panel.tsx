"use client";

import { Pencil, Package, DollarSign, Tag, Truck, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusToggle } from "@/components/shared/status-toggle";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { setProductActiveAction } from "../actions";

type ProductRow = Tables<"products">;

export function ProductDetailPanel({
  open,
  onOpenChange,
  product,
  supplierName,
  currency,
  locale,
  onEdit,
  onRegisterMovement,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  supplierName: string | null;
  currency: string;
  locale: string;
  onEdit: () => void;
  onRegisterMovement: () => void;
}) {
  const t = useTranslations("inventory.products.detail");
  const tUnits = useTranslations("inventory.products.units");
  const tCommon = useTranslations("common");

  if (!product) return null;

  const lowStock = product.stock_qty <= product.min_stock;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle>{t("title")}</SheetTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={14} />
              {t("edit")}
            </Button>
          </div>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div>
            <p className="truncate text-base font-semibold text-text-primary">
              {product.name}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? tCommon("active") : tCommon("inactive")}
              </Badge>
              {lowStock && <Badge variant="destructive">{t("lowStockBadge")}</Badge>}
            </div>
          </div>

          <dl className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Package size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("stock")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {product.stock_qty} {tUnits(product.unit)} · {t("min")} {product.min_stock}
              </dd>
            </div>
            {product.sku && (
              <div className="flex items-center gap-2 text-sm">
                <Tag size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("sku")}</dt>
                <dd className="ml-auto font-medium text-text-primary">{product.sku}</dd>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("cost")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatMoney(product.cost_cents, currency, locale)}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("price")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatMoney(product.price_cents, currency, locale)}
              </dd>
            </div>
            {supplierName && (
              <div className="flex items-center gap-2 text-sm">
                <Truck size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("supplier")}</dt>
                <dd className="ml-auto font-medium text-text-primary">{supplierName}</dd>
              </div>
            )}
          </dl>

          <Button variant="outline" onClick={onRegisterMovement}>
            <ArrowLeftRight size={16} />
            {t("registerMovement")}
          </Button>
        </div>

        <SheetFooter>
          <div className="flex items-center justify-between rounded-lg border border-card-border p-3">
            <span className="text-sm text-text-secondary">{t("statusLabel")}</span>
            <StatusToggle
              id={product.id}
              name={product.name}
              isActive={product.is_active}
              action={setProductActiveAction}
            />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
