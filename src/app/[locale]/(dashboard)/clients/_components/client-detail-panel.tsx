"use client";

import { Pencil, Phone, Mail, CalendarDays, CircleDollarSign } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusToggle } from "@/components/shared/status-toggle";
import { formatMoney } from "@/lib/utils/money";
import { formatSalonDate } from "@/lib/utils/dates";
import { getInitials } from "@/lib/utils/text";
import type { Tables } from "@/types/database";
import { setClientActiveAction } from "../actions";

type ClientRow = Tables<"clients">;

export function ClientDetailPanel({
  open,
  onOpenChange,
  client,
  currency,
  timezone,
  locale,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null;
  currency: string;
  timezone: string;
  locale: string;
  onEdit: () => void;
}) {
  const t = useTranslations("clients.detail");
  const tCommon = useTranslations("common");

  if (!client) return null;

  const preferences = Array.isArray(client.preferences)
    ? (client.preferences as string[])
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle>{t("title")}</SheetTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={14} />
              {t("edit")}
            </Button>
          </div>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary-light text-primary">
                {getInitials(client.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">
                {client.full_name}
              </p>
              <Badge variant={client.is_active ? "default" : "secondary"}>
                {client.is_active ? tCommon("active") : tCommon("inactive")}
              </Badge>
            </div>
          </div>

          <dl className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("phone")}</dt>
              <dd className="ml-auto font-medium text-text-primary">{client.phone || "—"}</dd>
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("email")}</dt>
                <dd className="ml-auto font-medium text-text-primary">{client.email}</dd>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("clientSince")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatSalonDate(client.created_at, timezone, locale)}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("lastVisit")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {client.last_visit_at
                  ? formatSalonDate(client.last_visit_at, timezone, locale)
                  : t("noDataYet")}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CircleDollarSign size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("totalSpent")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatMoney(client.total_spent_cents, currency, locale)}
              </dd>
            </div>
          </dl>

          {client.notes && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-primary">
                {t("notes")}
              </p>
              <p className="text-sm text-text-secondary whitespace-pre-line">
                {client.notes}
              </p>
            </div>
          )}

          {preferences.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-primary">
                {t("preferences")}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                {preferences.map((preference) => (
                  <li key={preference}>{preference}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <SheetFooter>
          <div className="flex items-center justify-between rounded-lg border border-card-border p-3">
            <span className="text-sm text-text-secondary">{t("statusLabel")}</span>
            <StatusToggle
              id={client.id}
              name={client.full_name}
              isActive={client.is_active}
              action={setClientActiveAction}
            />
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
