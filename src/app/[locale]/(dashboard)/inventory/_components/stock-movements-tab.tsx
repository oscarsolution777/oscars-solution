"use client";

import { Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";

type StockMovementRow = Tables<"stock_movements">;
type ProductRow = Tables<"products">;

const TYPE_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  in: "default",
  out: "outline",
  adjustment: "secondary",
  loss: "destructive",
};

export function StockMovementsTab({
  movements,
  productsById,
  timezone,
  locale,
  onCreate,
}: {
  movements: StockMovementRow[];
  productsById: Map<string, ProductRow>;
  timezone: string;
  locale: string;
  onCreate: () => void;
}) {
  const t = useTranslations("inventory.movements");
  const tUnits = useTranslations("inventory.products.units");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      {movements.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={<Button onClick={onCreate}>{t("createFirst")}</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.columnProduct")}</TableHead>
                <TableHead>{t("table.columnType")}</TableHead>
                <TableHead>{t("table.columnQty")}</TableHead>
                <TableHead>{t("table.columnReason")}</TableHead>
                <TableHead>{t("table.columnDate")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => {
                const product = productsById.get(movement.product_id);
                return (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium text-text-primary">
                      {product?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_BADGE_VARIANT[movement.type] ?? "outline"}>
                        {t(`types.${movement.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
                      {product ? ` ${tUnits(product.unit)}` : ""}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {movement.reason || "—"}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {formatSalonDate(movement.created_at, timezone, locale, "PP")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
