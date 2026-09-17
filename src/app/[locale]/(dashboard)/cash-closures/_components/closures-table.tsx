"use client";

import { Pencil } from "lucide-react";
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
import { formatMoney } from "@/lib/utils/money";
import { formatCalendarDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";

type CashClosureRow = Tables<"cash_closures">;

export function ClosuresTable({
  closures,
  currency,
  locale,
  onEdit,
  onCreate,
}: {
  closures: CashClosureRow[];
  currency: string;
  locale: string;
  onEdit: (closure: CashClosureRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("cashClosures.table");

  if (closures.length === 0) {
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
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnOpening")}</TableHead>
            <TableHead>{t("columnExpected")}</TableHead>
            <TableHead>{t("columnCounted")}</TableHead>
            <TableHead>{t("columnDifference")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {closures.map((closure) => {
            const isBalanced = closure.difference_cents === 0;
            return (
              <TableRow key={closure.id}>
                <TableCell className="font-medium text-text-primary">
                  {formatCalendarDate(closure.closure_date, locale, "PP")}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatMoney(closure.opening_cash_cents, currency, locale)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatMoney(closure.expected_cash_cents, currency, locale)}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {formatMoney(closure.counted_cash_cents, currency, locale)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      isBalanced
                        ? "font-medium text-emerald-600"
                        : "font-medium text-amber-600"
                    }
                  >
                    {closure.difference_cents > 0 ? "+" : ""}
                    {formatMoney(closure.difference_cents, currency, locale)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(closure)}
                    aria-label={t("editAction")}
                  >
                    <Pencil size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
