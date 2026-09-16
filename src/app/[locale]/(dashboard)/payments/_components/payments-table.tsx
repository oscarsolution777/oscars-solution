"use client";

import { useState, useTransition } from "react";
import { Pencil, Check, RotateCcw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
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
import { setPaymentStatusAction } from "../actions";

type PaymentRow = Tables<"payments">;
type ClientRow = Tables<"clients">;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  refunded: "outline",
};

export function PaymentsTable({
  payments,
  clientsById,
  currency,
  timezone,
  locale,
  onEdit,
  onCreate,
}: {
  payments: PaymentRow[];
  clientsById: Map<string, ClientRow>;
  currency: string;
  timezone: string;
  locale: string;
  onEdit: (payment: PaymentRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("payments.table");
  const tMethods = useTranslations("payments.methods");
  const tStatuses = useTranslations("payments.statuses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);

  const applyStatus = (paymentId: string, status: string) => {
    startTransition(async () => {
      const result = await setPaymentStatusAction(paymentId, status);
      if (result.ok) router.refresh();
    });
  };

  if (payments.length === 0) {
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
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnAmount")}</TableHead>
            <TableHead>{t("columnMethod")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium text-text-primary">
                {clientsById.get(payment.client_id)?.full_name ?? "—"}
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                {formatMoney(payment.amount_cents, currency, locale)}
              </TableCell>
              <TableCell className="text-text-secondary">{tMethods(payment.method)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE_VARIANT[payment.status] ?? "outline"}>
                  {tStatuses(payment.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatSalonDate(payment.paid_at, timezone, locale, "PP")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {payment.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => applyStatus(payment.id, "paid")}
                      aria-label={t("markPaidAction")}
                    >
                      <Check size={16} />
                    </Button>
                  )}
                  {payment.status === "paid" && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      onClick={() => setRefundTarget(payment)}
                      aria-label={t("refundAction")}
                    >
                      <RotateCcw size={16} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(payment)}
                    aria-label={t("editAction")}
                  >
                    <Pencil size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={refundTarget !== null} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("refundDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {refundTarget
                ? t("refundDialog.description", {
                    amount: formatMoney(refundTarget.amount_cents, currency, locale),
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("refundDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (refundTarget) applyStatus(refundTarget.id, "refunded");
                setRefundTarget(null);
              }}
            >
              {t("refundDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
