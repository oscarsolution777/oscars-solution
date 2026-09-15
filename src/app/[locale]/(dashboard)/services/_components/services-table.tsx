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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { ServiceThumbnail } from "./service-thumbnail";
import { StatusToggle } from "./status-toggle";
import { setServiceActiveAction } from "../actions";

type ServiceRow = Tables<"services">;
type CategoryRow = Tables<"service_categories">;

export function ServicesTable({
  services,
  categoriesById,
  currency,
  locale,
  canWrite,
  onView,
  onEdit,
  onCreate,
}: {
  services: ServiceRow[];
  categoriesById: Map<string, CategoryRow>;
  currency: string;
  locale: string;
  canWrite: boolean;
  onView: (service: ServiceRow) => void;
  onEdit: (service: ServiceRow) => void;
  onCreate: () => void;
}) {
  const t = useTranslations("services.table");
  const tCommon = useTranslations("common");

  if (services.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          canWrite ? (
            <Button onClick={onCreate}>{t("createFirst")}</Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnService")}</TableHead>
            <TableHead>{t("columnCategory")}</TableHead>
            <TableHead>{t("columnPrice")}</TableHead>
            <TableHead>{t("columnDuration")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const category = categoriesById.get(service.category_id);
            return (
              <TableRow key={service.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => onView(service)}
                    className="flex items-center gap-3 text-left"
                  >
                    <ServiceThumbnail imageUrl={service.image_url} name={service.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="truncate text-xs text-text-secondary">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </button>
                </TableCell>
                <TableCell>
                  {category ? (
                    <Badge variant="outline">{category.name}</Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="font-medium text-text-primary">
                  {formatMoney(service.price_cents, currency, locale)}
                </TableCell>
                <TableCell>{t("durationValue", { count: service.duration_min })}</TableCell>
                <TableCell>
                  {canWrite ? (
                    <StatusToggle
                      id={service.id}
                      name={service.name}
                      isActive={service.is_active}
                      action={setServiceActiveAction}
                    />
                  ) : (
                    <Badge variant={service.is_active ? "default" : "secondary"}>
                      {service.is_active ? tCommon("active") : tCommon("inactive")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onView(service)}
                      aria-label={t("viewAction")}
                    >
                      <Eye size={16} />
                    </Button>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(service)}
                        aria-label={t("editAction")}
                      >
                        <Pencil size={16} />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
