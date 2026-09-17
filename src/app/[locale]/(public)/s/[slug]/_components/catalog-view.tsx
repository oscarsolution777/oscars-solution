"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/utils/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Tables } from "@/types/database";

type CategoryRow = Tables<"service_categories">;
type ServiceRow = Tables<"services">;

export function CatalogView({
  slug,
  locale,
  currency,
  categories,
  services,
}: {
  slug: string;
  locale: string;
  currency: string;
  categories: CategoryRow[];
  services: ServiceRow[];
}) {
  const t = useTranslations("portal.catalog");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const servicesByCategory = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const category of categories) {
      map.set(
        category.id,
        services
          .filter((s) => s.category_id === category.id)
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    }
    return map;
  }, [categories, services]);

  function toggle(serviceId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  }

  function handleContinue() {
    const items = Array.from(selected).join(",");
    router.push(`/s/${slug}/solicitud?items=${items}`);
  }

  if (services.length === 0) {
    return (
      <div className="p-4">
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div>
        <h1 className="font-heading text-lg font-semibold text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      {categories.map((category) => {
        const categoryServices = servicesByCategory.get(category.id) ?? [];
        if (categoryServices.length === 0) return null;

        return (
          <div key={category.id} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-text-secondary uppercase">
              {category.name}
            </h2>
            {categoryServices.map((service) => {
              const isSelected = selected.has(service.id);
              return (
                <Card key={service.id} className={isSelected ? "ring-2 ring-primary" : undefined}>
                  <CardHeader>
                    <CardTitle>{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription>{service.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text-primary">
                      {formatMoney(service.price_cents, currency, locale)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "secondary" : "outline"}
                      onClick={() => toggle(service.id)}
                    >
                      {isSelected ? t("addedLabel") : t("addButton")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );
      })}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-card-border bg-card-bg p-4">
          <div className="mx-auto max-w-lg">
            <Button type="button" className="w-full" onClick={handleContinue}>
              {t("continueButton", { count: selected.size })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
