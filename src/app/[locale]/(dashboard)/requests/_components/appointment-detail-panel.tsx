"use client";

import { CalendarDays, User, Phone, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils/money";
import { formatCalendarDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";

type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ClientRow = Tables<"clients">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "secondary",
  completed: "default",
  no_show: "destructive",
  cancelled: "outline",
};

// Ficha de solo lectura de la cita (punto 8 de los ajustes pedidos): fecha,
// cliente, servicios con su trabajador asignado, precio de cada uno y total.
// appointment_date es una columna `date` pura (sin hora), por eso se formatea
// siempre con formatCalendarDate en vez de formatSalonDate (CLAUDE.md
// sección 5, "Fechas").
export function AppointmentDetailPanel({
  open,
  onOpenChange,
  appointment,
  items,
  client,
  servicesById,
  staffById,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentRow | null;
  items: AppointmentItemRow[];
  client: ClientRow | null;
  servicesById: Map<string, ServiceRow>;
  staffById: Map<string, StaffRow>;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("requests.agenda.detail");
  const tStatuses = useTranslations("requests.appointmentStatuses");

  if (!appointment) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-text-muted" />
              <span className="font-medium text-text-primary">
                {formatCalendarDate(appointment.appointment_date, locale, "PPP")}
              </span>
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[appointment.status] ?? "outline"}>
              {tStatuses(appointment.status)}
            </Badge>
          </div>

          <dl className="space-y-3 rounded-lg border border-card-border p-3">
            <div className="flex items-center gap-2 text-sm">
              <User size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("client")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {client?.full_name ?? "—"}
              </dd>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("phone")}</dt>
                <dd className="ml-auto font-medium text-text-primary">{client.phone}</dd>
              </div>
            )}
            {client?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("email")}</dt>
                <dd className="ml-auto font-medium text-text-primary">{client.email}</dd>
              </div>
            )}
          </dl>

          <div>
            <p className="mb-1.5 text-sm font-medium text-text-primary">{t("servicesLabel")}</p>
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-card-border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">
                      {servicesById.get(item.service_id)?.name ?? "—"}
                    </p>
                    <p className="truncate text-text-muted">
                      {staffById.get(item.staff_id)?.full_name ?? t("unassignedStaff")}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-text-primary">
                    {formatMoney(item.price_cents, currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-card-border pt-3 text-sm">
            <span className="font-medium text-text-primary">{t("total")}</span>
            <span className="text-base font-semibold text-text-primary">
              {formatMoney(appointment.total_cents, currency, locale)}
            </span>
          </div>

          {appointment.notes && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-primary">{t("notes")}</p>
              <p className="whitespace-pre-line text-sm text-text-secondary">
                {appointment.notes}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
