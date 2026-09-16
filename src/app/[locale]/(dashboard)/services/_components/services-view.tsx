"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { KpiCards } from "./kpi-cards";
import { ServicesTable } from "./services-table";
import { CategoriesTab } from "./categories-tab";
import { ServiceDetailPanel } from "./service-detail-panel";
import { ServiceFormPanel } from "./service-form-panel";
import { CategoryFormPanel } from "./category-form-panel";
import { ServiceProductsPanel } from "./service-products-panel";

type ServiceRow = Tables<"services">;
type CategoryRow = Tables<"service_categories">;
type ProductRow = Tables<"products">;
type ServiceProductRow = { service_id: string; product_id: string; qty: number };

const WRITE_ROLES = new Set(["owner", "admin"]);

export function ServicesView({
  categories,
  services,
  products,
  serviceProducts,
  kpis,
  currency,
  locale,
  role,
}: {
  categories: CategoryRow[];
  services: ServiceRow[];
  products: ProductRow[];
  serviceProducts: ServiceProductRow[];
  kpis: {
    totalServices: number;
    totalCategories: number;
    avgPriceCents: number;
    avgDurationMin: number;
  };
  currency: string;
  locale: string;
  role: string;
}) {
  const t = useTranslations("services");
  const canWrite = WRITE_ROLES.has(role);

  const [tab, setTab] = useState<"services" | "categories">("services");

  const [viewingServiceId, setViewingServiceId] = useState<string | null>(null);
  const [serviceFormState, setServiceFormState] = useState<
    { mode: "create" } | { mode: "edit"; serviceId: string } | null
  >(null);
  const [categoryFormState, setCategoryFormState] = useState<
    { mode: "create" } | { mode: "edit"; categoryId: string } | null
  >(null);
  const [productsFormServiceId, setProductsFormServiceId] = useState<string | null>(null);

  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const viewingService = viewingServiceId
    ? (services.find((service) => service.id === viewingServiceId) ?? null)
    : null;

  const editingService =
    serviceFormState?.mode === "edit"
      ? (services.find((service) => service.id === serviceFormState.serviceId) ?? null)
      : null;

  const editingCategory =
    categoryFormState?.mode === "edit"
      ? (categories.find((category) => category.id === categoryFormState.categoryId) ?? null)
      : null;

  const productsFormService = productsFormServiceId
    ? (services.find((service) => service.id === productsFormServiceId) ?? null)
    : null;

  const assignedQtyByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of serviceProducts) {
      if (row.service_id === productsFormServiceId) map.set(row.product_id, row.qty);
    }
    return map;
  }, [serviceProducts, productsFormServiceId]);

  const viewingServiceProducts = useMemo(() => {
    if (!viewingService) return [];
    return serviceProducts
      .filter((row) => row.service_id === viewingService.id)
      .map((row) => ({ product: productsById.get(row.product_id), qty: row.qty }))
      .filter((entry): entry is { product: ProductRow; qty: number } => Boolean(entry.product));
  }, [serviceProducts, viewingService, productsById]);

  return (
    <div className="space-y-6">
      <KpiCards
        totalServices={kpis.totalServices}
        totalCategories={kpis.totalCategories}
        avgPriceCents={kpis.avgPriceCents}
        avgDurationMin={kpis.avgDurationMin}
        currency={currency}
        locale={locale}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="services">{t("tabs.services")}</TabsTrigger>
            <TabsTrigger value="categories">{t("tabs.categories")}</TabsTrigger>
          </TabsList>

          {tab === "services" && canWrite && (
            <Button onClick={() => setServiceFormState({ mode: "create" })}>
              <Plus size={16} />
              {t("createServiceButton")}
            </Button>
          )}
        </div>

        <TabsContent value="services">
          <ServicesTable
            services={services}
            categoriesById={categoriesById}
            currency={currency}
            locale={locale}
            canWrite={canWrite}
            onView={(service) => setViewingServiceId(service.id)}
            onEdit={(service) => setServiceFormState({ mode: "edit", serviceId: service.id })}
            onCreate={() => setServiceFormState({ mode: "create" })}
          />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesTab
            categories={categories}
            services={services}
            canWrite={canWrite}
            onCreate={() => setCategoryFormState({ mode: "create" })}
            onEdit={(category) =>
              setCategoryFormState({ mode: "edit", categoryId: category.id })
            }
          />
        </TabsContent>
      </Tabs>

      <ServiceDetailPanel
        open={viewingServiceId !== null}
        onOpenChange={(open) => !open && setViewingServiceId(null)}
        service={viewingService}
        categoryName={
          viewingService ? (categoriesById.get(viewingService.category_id)?.name ?? "—") : ""
        }
        assignedProducts={viewingServiceProducts}
        currency={currency}
        locale={locale}
        canWrite={canWrite}
        onEdit={() => {
          if (!viewingService) return;
          setServiceFormState({ mode: "edit", serviceId: viewingService.id });
          setViewingServiceId(null);
        }}
        onEditProducts={() => {
          if (!viewingService) return;
          setProductsFormServiceId(viewingService.id);
          setViewingServiceId(null);
        }}
      />

      {canWrite && (
        <ServiceFormPanel
          open={serviceFormState !== null}
          onOpenChange={(open) => !open && setServiceFormState(null)}
          service={editingService}
          categories={categories}
          currency={currency}
        />
      )}

      {canWrite && (
        <CategoryFormPanel
          open={categoryFormState !== null}
          onOpenChange={(open) => !open && setCategoryFormState(null)}
          category={editingCategory}
        />
      )}

      {canWrite && (
        <ServiceProductsPanel
          open={productsFormServiceId !== null}
          onOpenChange={(open) => !open && setProductsFormServiceId(null)}
          service={productsFormService}
          products={products}
          assignedQtyByProductId={assignedQtyByProductId}
        />
      )}
    </div>
  );
}
