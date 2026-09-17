"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
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
import { formatCalendarDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { setRequestStatusAction } from "../actions";

type RequestRow = Tables<"requests">;
type RequestItemRow = Tables<"request_items">;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  rejected: "destructive",
  cancelled: "outline",
};

export function RequestsTable({
  requests,
  itemsByRequestId,
  locale,
  onConfirm,
  onCreate,
}: {
  requests: RequestRow[];
  itemsByRequestId: Map<string, RequestItemRow[]>;
  locale: string;
  onConfirm: (request: RequestRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("requests.inbox");
  const tStatuses = useTranslations("requests.statuses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<RequestRow | null>(null);

  const applyStatus = (requestId: string, status: string) => {
    startTransition(async () => {
      const result = await setRequestStatusAction(requestId, status);
      if (result.ok) router.refresh();
    });
  };

  if (requests.length === 0) {
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
            <TableHead>{t("columnServices")}</TableHead>
            <TableHead>{t("columnPreferredDate")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const items = itemsByRequestId.get(request.id) ?? [];
            return (
              <TableRow key={request.id}>
                <TableCell className="font-medium text-text-primary">
                  <div>{request.client_name}</div>
                  {request.client_phone && (
                    <div className="text-xs text-text-muted">{request.client_phone}</div>
                  )}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {items.map((item) => item.service_name_snapshot).join(", ") || "—"}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {request.preferred_date
                    ? formatCalendarDate(request.preferred_date, locale, "PP")
                    : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[request.status] ?? "outline"}>
                    {tStatuses(request.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {request.status === "pending" && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => onConfirm(request)}
                        aria-label={t("confirmAction")}
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setRejectTarget(request)}
                        aria-label={t("rejectAction")}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={rejectTarget !== null} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rejectDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectTarget ? t("rejectDialog.description", { name: rejectTarget.client_name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("rejectDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (rejectTarget) applyStatus(rejectTarget.id, "rejected");
                setRejectTarget(null);
              }}
            >
              {t("rejectDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
