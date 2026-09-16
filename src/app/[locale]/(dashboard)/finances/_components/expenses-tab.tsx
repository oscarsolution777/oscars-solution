"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { deleteExpenseAction } from "../actions";

type ExpenseRow = Tables<"expenses">;
type SupplierRow = Tables<"suppliers">;

export function ExpensesTab({
  expenses,
  suppliersById,
  currency,
  timezone,
  locale,
  onEdit,
  onCreate,
}: {
  expenses: ExpenseRow[];
  suppliersById: Map<string, SupplierRow>;
  currency: string;
  timezone: string;
  locale: string;
  onEdit: (expense: ExpenseRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("finances.expenses.table");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const expenseId = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteExpenseAction(expenseId);
      if (result.ok) router.refresh();
    });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      {expenses.length === 0 ? (
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
                <TableHead>{t("columnCategory")}</TableHead>
                <TableHead>{t("columnDescription")}</TableHead>
                <TableHead>{t("columnAmount")}</TableHead>
                <TableHead>{t("columnSupplier")}</TableHead>
                <TableHead>{t("columnDate")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-text-primary">
                    {expense.category}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {expense.description || "—"}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {formatMoney(expense.amount_cents, currency, locale)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {expense.supplier_id
                      ? (suppliersById.get(expense.supplier_id)?.name ?? "—")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatSalonDate(`${expense.spent_at}T00:00:00`, timezone, locale, "PP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(expense)}
                        aria-label={t("editAction")}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(expense)}
                        aria-label={t("deleteAction")}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t("deleteDialog.description", { category: deleteTarget.category }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
