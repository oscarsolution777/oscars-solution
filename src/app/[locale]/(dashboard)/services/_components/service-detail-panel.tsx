"use client";

import { Pencil, Tag, CircleDollarSign, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { ServiceThumbnail } from "./service-thumbnail";
import { StatusToggle } from "@/components/shared/status-toggle";
import { setServiceActiveAction } from "../actions";

type ServiceRow = Tables<"services">;

export function ServiceDetailPanel({
  open,
  onOpenChange,
  service,
  categoryName,
  currency,
  locale,
  canWrite,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRow | null;
  categoryName: string;
  currency: string;
  locale: string;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("services.detail");
  const tCommon = useTranslations("common");

  if (!service) return null;

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
            <ServiceThumbnail imageUrl={service.image_url} name={service.name} size={64} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-text-primary">
                {service.name}
              </p>
              <Badge variant={service.is_active ? "default" : "secondary"}>
                {service.is_active ? tCommon("active") : tCommon("inactive")}
              </Badge>
            </div>
          </div>

          {service.description && (
            <p className="text-sm text-text-secondary">{service.description}</p>
          )}

          <dl className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Tag size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("category")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {categoryName}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CircleDollarSign size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("price")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {formatMoney(service.price_cents, currency, locale)}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-text-muted" />
              <dt className="text-text-muted">{t("duration")}</dt>
              <dd className="ml-auto font-medium text-text-primary">
                {t("durationValue", { count: service.duration_min })}
              </dd>
            </div>
          </dl>

          {service.features.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-text-primary">
                {t("features")}
              </p>
              <ul className="list-inside list-disc space-y-1 text-sm text-text-secondary">
                {service.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {canWrite && (
          <SheetFooter>
            <div className="flex items-center justify-between rounded-lg border border-card-border p-3">
              <span className="text-sm text-text-secondary">{t("statusLabel")}</span>
              <StatusToggle
                id={service.id}
                name={service.name}
                isActive={service.is_active}
                action={setServiceActiveAction}
              />
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
