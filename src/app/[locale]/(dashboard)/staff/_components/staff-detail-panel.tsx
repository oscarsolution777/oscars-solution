"use client";

import { Pencil, Phone, Briefcase, Wallet, CalendarDays } from "lucide-react";
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
import { setStaffActiveAction } from "../actions";

type StaffRow = Tables<"staff">;
type ServiceRow = Tables<"services">;

export function StaffDetailPanel({
  open,
  onOpenChange,
  staffMember,
  assignedServices,
  currency,
  timezone,
  locale,
  canWrite,
  onEdit,
  onEditServices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: StaffRow | null;
  assignedServices: ServiceRow[];
  currency: string;
  timezone: string;
  locale: string;
  canWrite: boolean;
  onEdit: () => void;
  onEditServices: () => void;
}) {
  const t = useTranslations("staff.detail");
  const tCommon = useTranslations("common");

  if (!staffMember) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-2">
            <SheetTitle>{t("title")}</SheetTitle>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil size={14} />
                {t("edit")}
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">{t("title")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary-light text-primary">
                {getInitials(staffMember.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">
                {staffMember.full_name}
              </p>
              <Badge variant={staffMember.is_active ? "default" : "secondary"}>
                {staffMember.is_active ? tCommon("active") : tCommon("inactive")}
              </Badge>
            </div>
          </div>

          <dl className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Briefcase size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("role")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {staffMember.role_title}
              </dd>
            </div>
            {staffMember.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-text-muted" />
                <dt className="text-text-muted">{t("phone")}</dt>
                <dd className="ml-auto font-medium text-text-primary">
                  {staffMember.phone}
                </dd>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Wallet size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("baseSalary")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatMoney(staffMember.base_salary_cents, currency, locale)}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("hiredAt")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatSalonDate(staffMember.hired_at, timezone, locale)}
              </dd>
            </div>
          </dl>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium text-text-primary">{t("services")}</p>
              {canWrite && (
                <Button variant="ghost" size="sm" onClick={onEditServices}>
                  {t("editServices")}
                </Button>
              )}
            </div>
            {assignedServices.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedServices.map((service) => (
                  <Badge key={service.id} variant="outline">
                    {service.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{t("noServicesAssigned")}</p>
            )}
          </div>
        </div>

        {canWrite && (
          <SheetFooter>
            <div className="flex items-center justify-between rounded-lg border border-card-border p-3">
              <span className="text-sm text-text-secondary">{t("statusLabel")}</span>
              <StatusToggle
                id={staffMember.id}
                name={staffMember.full_name}
                isActive={staffMember.is_active}
                action={setStaffActiveAction}
              />
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
