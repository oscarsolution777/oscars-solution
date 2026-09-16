"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusToggle } from "@/components/shared/status-toggle";
import type { Tables } from "@/types/database";
import { setSupplierActiveAction } from "../actions";

type SupplierRow = Tables<"suppliers">;

export function SuppliersTab({
  suppliers,
  onCreate,
  onEdit,
}: {
  suppliers: SupplierRow[];
  onCreate: () => void;
  onEdit: (supplier: SupplierRow) => void;
}) {
  const t = useTranslations("inventory.suppliers.table");

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      {suppliers.length === 0 ? (
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
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnPhone")}</TableHead>
                <TableHead>{t("columnEmail")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead className="text-right">{t("columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium text-text-primary">
                    {supplier.name}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {supplier.phone || "—"}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {supplier.email || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusToggle
                      id={supplier.id}
                      name={supplier.name}
                      isActive={supplier.is_active}
                      action={setSupplierActiveAction}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onEdit(supplier)}
                      aria-label={t("editAction")}
                    >
                      <Pencil size={16} />
                    </Button>
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
