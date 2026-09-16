"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, UserX, Ban } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
import { setAppointmentStatusAction, rescheduleAppointmentAction } from "../actions";

type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ClientRow = Tables<"clients">;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  completed: "default",
  no_show: "destructive",
  cancelled: "outline",
};

export function AppointmentsTable({
  appointments,
  itemsByAppointmentId,
  clientsById,
  currency,
  timezone,
  locale,
}: {
  appointments: AppointmentRow[];
  itemsByAppointmentId: Map<string, AppointmentItemRow[]>;
  clientsById: Map<string, ClientRow>;
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("requests.agenda");
  const tStatuses = useTranslations("requests.appointmentStatuses");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelTarget, setCancelTarget] = useState<AppointmentRow | null>(null);

  const applyStatus = (appointmentId: string, status: string) => {
    startTransition(async () => {
      const result = await setAppointmentStatusAction(appointmentId, status);
      if (result.ok) router.refresh();
    });
  };

  const applyReschedule = (appointmentId: string, date: string) => {
    if (!date) return;
    startTransition(async () => {
      const result = await rescheduleAppointmentAction(appointmentId, date);
      if (result.ok) router.refresh();
    });
  };

  if (appointments.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnDate")}</TableHead>
            <TableHead>{t("columnClient")}</TableHead>
            <TableHead>{t("columnServices")}</TableHead>
            <TableHead>{t("columnTotal")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((appointment) => {
            const items = itemsByAppointmentId.get(appointment.id) ?? [];
            return (
              <TableRow key={appointment.id}>
                <TableCell className="text-text-secondary">
                  {appointment.status === "scheduled" ? (
                    <Input
                      type="date"
                      defaultValue={appointment.appointment_date}
                      className="h-8 w-36"
                      disabled={isPending}
                      onChange={(event) => applyReschedule(appointment.id, event.target.value)}
                    />
                  ) : (
                    formatSalonDate(appointment.appointment_date, timezone, locale, "PP")
                  )}
                </TableCell>
                <TableCell className="font-medium text-text-primary">
                  {clientsById.get(appointment.client_id)?.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-text-secondary">
                  {items.length} {t("serviceCount", { count: items.length })}
                </TableCell>
                <TableCell className="font-medium text-text-primary">
                  {formatMoney(appointment.total_cents, currency, locale)}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[appointment.status] ?? "outline"}>
                    {tStatuses(appointment.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {appointment.status === "scheduled" && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => applyStatus(appointment.id, "completed")}
                        aria-label={t("completeAction")}
                      >
                        <CheckCircle2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => applyStatus(appointment.id, "no_show")}
                        aria-label={t("noShowAction")}
                      >
                        <UserX size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        onClick={() => setCancelTarget(appointment)}
                        aria-label={t("cancelAction")}
                      >
                        <Ban size={16} />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancelDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancelDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (cancelTarget) applyStatus(cancelTarget.id, "cancelled");
                setCancelTarget(null);
              }}
            >
              {t("cancelDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
