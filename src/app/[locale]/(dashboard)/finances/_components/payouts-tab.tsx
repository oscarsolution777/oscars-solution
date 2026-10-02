"use client";

import { useState, useTransition } from "react";
import { Pencil, Check } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { formatMoney } from "@/lib/utils/money";
import { formatCalendarDate } from "@/lib/utils/dates";
import { usePagination } from "@/lib/utils/pagination";
import type { Tables } from "@/types/database";
import { markPayoutPaidAction } from "../actions";

type StaffPayoutRow = Tables<"staff_payouts">;
type StaffRow = Tables<"staff">;

export function PayoutsTab({
  payouts,
  staffById,
  currency,
  locale,
  onEdit,
  onCreate,
}: {
  payouts: StaffPayoutRow[];
  staffById: Map<string, StaffRow>;
  currency: string;
  locale: string;
  onEdit: (payout: StaffPayoutRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("finances.payouts.table");
  const tStatuses = useTranslations("finances.payouts.statuses");
  const tConfirm = useTranslations("finances.payouts.confirmDialog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { page, setPage, totalPages, pageItems } = usePagination(payouts);
  // Punto 11 del bloque de ajustes: pasar a "pagada" ya no ocurre con un
  // solo clic -- pide confirmación explícita (sin deshacer posible, igual
  // que el resto de acciones irreversibles de la sección 12 de CLAUDE.md),
  // porque una vez pagada la nómina queda bloqueada para editar.
  const [confirmTarget, setConfirmTarget] = useState<StaffPayoutRow | null>(null);

  const markPaid = (payoutId: string) => {
    startTransition(async () => {
      const result = await markPayoutPaidAction(payoutId);
      if (result.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onCreate}>{t("createButton")}</Button>
      </div>

      {payouts.length === 0 ? (
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
                <TableHead>{t("columnStaff")}</TableHead>
                <TableHead>{t("columnPeriod")}</TableHead>
                <TableHead>{t("columnBase")}</TableHead>
                <TableHead>{t("columnBonus")}</TableHead>
                <TableHead>{t("columnTotal")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium text-text-primary">
                    {staffById.get(payout.staff_id)?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatCalendarDate(payout.period_start, locale, "PP")}
                    {" – "}
                    {formatCalendarDate(payout.period_end, locale, "PP")}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatMoney(payout.base_cents, currency, locale)}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatMoney(payout.bonus_cents, currency, locale)}
                  </TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {formatMoney(payout.total_cents, currency, locale)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payout.status === "paid" ? "default" : "secondary"}>
                      {tStatuses(payout.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {payout.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onEdit(payout)}
                            aria-label={t("editAction")}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={() => setConfirmTarget(payout)}
                            aria-label={t("markPaidAction")}
                          >
                            <Check size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget &&
                tConfirm("description", {
                  name: staffById.get(confirmTarget.staff_id)?.full_name ?? "—",
                  amount: formatMoney(confirmTarget.total_cents, currency, locale),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tConfirm("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmTarget) markPaid(confirmTarget.id);
                setConfirmTarget(null);
              }}
            >
              {tConfirm("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
