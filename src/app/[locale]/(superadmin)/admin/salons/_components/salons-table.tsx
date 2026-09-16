"use client";

import { useTransition } from "react";
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

  if (salons.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const toggleStatus = (salon: SalonRow) => {
    const next = salon.subscription_status === "suspended" ? "active" : "suspended";
    startTransition(async () => {
      const result = await setSalonStatusAction(salon.id, next);
      if (result.ok) router.refresh();
    });
  };

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
                {salon.subscription_status === "suspended" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => toggleStatus(salon)}
                  >
                    {t("activateAction")}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => toggleStatus(salon)}
                  >
                    {t("suspendAction")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
