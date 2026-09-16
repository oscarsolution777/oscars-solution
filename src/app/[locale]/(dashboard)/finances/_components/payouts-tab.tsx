"use client";

import { useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { markPayoutPaidAction } from "../actions";

type StaffPayoutRow = Tables<"staff_payouts">;
type StaffRow = Tables<"staff">;

export function PayoutsTab({
  payouts,
  staffById,
  currency,
  timezone,
  locale,
  onEdit,
  onCreate,
}: {
  payouts: StaffPayoutRow[];
  staffById: Map<string, StaffRow>;
  currency: string;
  timezone: string;
  locale: string;
  onEdit: (payout: StaffPayoutRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("finances.payouts.table");
  const tStatuses = useTranslations("finances.payouts.statuses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
              {payouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell className="font-medium text-text-primary">
                    {staffById.get(payout.staff_id)?.full_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {formatSalonDate(`${payout.period_start}T00:00:00`, timezone, locale, "PP")}
                    {" – "}
                    {formatSalonDate(`${payout.period_end}T00:00:00`, timezone, locale, "PP")}
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
                            onClick={() => markPaid(payout.id)}
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
    </div>
  );
}
