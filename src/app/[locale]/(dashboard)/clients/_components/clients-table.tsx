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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusToggle } from "@/components/shared/status-toggle";
import { getInitials } from "@/lib/utils/text";
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { setClientActiveAction } from "../actions";

type ClientRow = Tables<"clients">;

export function ClientsTable({
  clients,
  timezone,
  locale,
  onView,
  onEdit,
  onCreate,
}: {
  clients: ClientRow[];
  timezone: string;
  locale: string;
  onView: (client: ClientRow) => void;
  onEdit: (client: ClientRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("clients.table");

  if (clients.length === 0) {
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
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnPhone")}</TableHead>
            <TableHead>{t("columnEmail")}</TableHead>
            <TableHead>{t("columnLastVisit")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onView(client)}
                  className="flex items-center gap-3 text-left"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary-light text-primary">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-text-primary">
                    {client.full_name}
                  </span>
                </button>
              </TableCell>
              <TableCell>{client.phone || "—"}</TableCell>
              <TableCell className="text-text-secondary">
                {client.email || "—"}
              </TableCell>
              <TableCell>
                {client.last_visit_at
                  ? formatSalonDate(client.last_visit_at, timezone, locale)
                  : t("noVisitsYet")}
              </TableCell>
              <TableCell>
                <StatusToggle
                  id={client.id}
                  name={client.full_name}
                  isActive={client.is_active}
                  action={setClientActiveAction}
                />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onView(client)}
                    aria-label={t("viewAction")}
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(client)}
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
    </div>
  );
}
