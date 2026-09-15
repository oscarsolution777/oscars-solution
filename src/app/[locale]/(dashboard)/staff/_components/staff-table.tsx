"use client";

import { Eye, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusToggle } from "@/components/shared/status-toggle";
import { formatMoney } from "@/lib/utils/money";
import { getInitials } from "@/lib/utils/text";
import type { Tables } from "@/types/database";
import { setStaffActiveAction } from "../actions";

type StaffRow = Tables<"staff">;

export function StaffTable({
  staff,
  currency,
  locale,
  canWrite,
  onView,
  onEdit,
  onCreate,
}: {
  staff: StaffRow[];
  currency: string;
  locale: string;
  canWrite: boolean;
  onView: (member: StaffRow) => void;
  onEdit: (member: StaffRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("staff.table");
  const tCommon = useTranslations("common");

  if (staff.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          canWrite ? <Button onClick={onCreate}>{t("createFirst")}</Button> : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnRole")}</TableHead>
            <TableHead>{t("columnPhone")}</TableHead>
            <TableHead>{t("columnSalary")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onView(member)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary-light text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-text-primary">
                    {member.full_name}
                  </span>
                </button>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{member.role_title}</Badge>
              </TableCell>
              <TableCell className="text-text-secondary">
                {member.phone || "—"}
              </TableCell>
              <TableCell className="font-medium text-text-primary">
                {formatMoney(member.base_salary_cents, currency, locale)}
              </TableCell>
              <TableCell>
                {canWrite ? (
                  <StatusToggle
                    id={member.id}
                    name={member.full_name}
                    isActive={member.is_active}
                    action={setStaffActiveAction}
                  />
                ) : (
                  <Badge variant={member.is_active ? "default" : "secondary"}>
                    {member.is_active ? tCommon("active") : tCommon("inactive")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onView(member)}
                    aria-label={t("viewAction")}
                  >
                    <Eye size={16} />
                  </Button>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(member)}
                      aria-label={t("editAction")}
                    >
                      <Pencil size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
