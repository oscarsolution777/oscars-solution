"use client";

import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { Tables } from "@/types/database";
import { StatusToggle } from "@/components/shared/status-toggle";
import { setCategoryActiveAction } from "../actions";

type CategoryRow = Tables<"service_categories">;
type ServiceRow = Tables<"services">;

export function CategoriesTab({
  categories,
  services,
  canWrite,
  onCreate,
  onEdit,
}: {
  categories: CategoryRow[];
  services: ServiceRow[];
  canWrite: boolean;
  onCreate: () => void;
  onEdit: (category: CategoryRow) => void;
}) {
  const t = useTranslations("services.categoriesTab");

  const serviceCountByCategory = new Map<string, number>();
  for (const service of services) {
    serviceCountByCategory.set(
      service.category_id,
      (serviceCountByCategory.get(service.category_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={onCreate}>
            <Plus size={16} />
            {t("createButton")}
          </Button>
        </div>
      )}

      {categories.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={canWrite ? <Button onClick={onCreate}>{t("createButton")}</Button> : undefined}
        />
      ) : (
        <div className="divide-y divide-card-border rounded-xl border border-card-border">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text-primary">
                  {category.name}
                </p>
                <p className="text-xs text-text-muted">
                  {t("serviceCount", {
                    count: serviceCountByCategory.get(category.id) ?? 0,
                  })}
                </p>
              </div>
              {!category.is_active && (
                <Badge variant="secondary">{t("inactive")}</Badge>
              )}
              {canWrite ? (
                <>
                  <StatusToggle
                    id={category.id}
                    name={category.name}
                    isActive={category.is_active}
                    action={setCategoryActiveAction}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(category)}
                    aria-label={t("editAction")}
                  >
                    <Pencil size={16} />
                  </Button>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
