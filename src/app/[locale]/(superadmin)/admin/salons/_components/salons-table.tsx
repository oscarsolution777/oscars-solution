"use client";

import { useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { SalonStatusBadge } from "./salon-status-badge";
import { setSalonStatusAction } from "../actions";

type SalonRow = Tables<"salons">;

export function SalonsTable({
  salons,
  locale,
}: {
  salons: SalonRow[];
  locale: string;
}) {
  const t = useTranslations("superadmin.salons.table");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Salón pendiente de confirmar suspensión (acción destructiva para la
  // dueña: le corta el acceso al panel — CLAUDE.md sección 12, "acciones
  // destructivas siempre con confirmación").
  const [salonToSuspend, setSalonToSuspend] = useState<SalonRow | null>(null);

  if (salons.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const applyStatus = (salon: SalonRow, next: "active" | "suspended") => {
    startTransition(async () => {
      const result = await setSalonStatusAction(salon.id, next);
      if (result.ok) router.refresh();
    });
  };

  // "Activo" es el único estado que se puede suspender; cualquier otro
  // (trial, suspended, cancelled) se reactiva con el mismo botón — antes solo
  // alternaba entre active/suspended y una demo en "trial" nunca podía
  // pasar a "active" desde esta tabla.
  const isActive = (salon: SalonRow) => salon.subscription_status === "active";

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnCurrency")}</TableHead>
            <TableHead>{t("columnLocale")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnDemo")}</TableHead>
            <TableHead>{t("columnCreatedAt")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salons.map((salon) => (
            <TableRow key={salon.id}>
              <TableCell>
                <div className="font-medium text-text-primary">{salon.name}</div>
                <div className="text-xs text-text-muted">{salon.slug}</div>
              </TableCell>
              <TableCell>{salon.currency}</TableCell>
              <TableCell className="uppercase text-text-secondary">
                {salon.default_locale}
              </TableCell>
              <TableCell>
                <SalonStatusBadge status={salon.subscription_status as "trial" | "active" | "suspended" | "cancelled"} />
              </TableCell>
              <TableCell>
                {salon.is_demo ? (
                  <Badge variant="secondary">
                    {salon.demo_expires_at
                      ? t("demoExpiresOn", {
                          date: formatSalonDate(salon.demo_expires_at, salon.timezone, locale),
                        })
                      : "—"}
                  </Badge>
                ) : (
                  <span className="text-text-muted">{t("notDemo")}</span>
                )}
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatSalonDate(salon.created_at, salon.timezone, locale)}
              </TableCell>
              <TableCell className="text-right">
                {isActive(salon) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setSalonToSuspend(salon)}
                  >
                    {t("suspendAction")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => applyStatus(salon, "active")}
                  >
                    {t("activateAction")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={salonToSuspend !== null} onOpenChange={(open) => !open && setSalonToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("suspendDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("suspendDialog.description", { name: salonToSuspend?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("suspendDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (salonToSuspend) applyStatus(salonToSuspend, "suspended");
                setSalonToSuspend(null);
              }}
            >
              {t("suspendDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
