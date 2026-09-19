"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProductsValueChart } from "@/components/shared/charts/products-value-chart";
import type { Tables } from "@/types/database";
import type { StockMovementPoint } from "@/lib/reports/aggregations";
import { KpiCards } from "./kpi-cards";
import { StockMovementsChart } from "./stock-movements-chart";
import { ProductsTable } from "./products-table";
import { ProductDetailPanel } from "./product-detail-panel";
import { ProductFormPanel } from "./product-form-panel";
import { SuppliersTab } from "./suppliers-tab";
import { SupplierFormPanel } from "./supplier-form-panel";
import { StockMovementsTab } from "./stock-movements-tab";
import { StockMovementFormPanel } from "./stock-movement-form-panel";

type ProductRow = Tables<"products">;
type SupplierRow = Tables<"suppliers">;
type StockMovementRow = Tables<"stock_movements">;

export function InventoryView({
  products,
  suppliers,
  movements,
  stockMovementTrend,
  kpis,
  currency,
  timezone,
  locale,
}: {
  products: ProductRow[];
  suppliers: SupplierRow[];
  movements: StockMovementRow[];
  stockMovementTrend: StockMovementPoint[];
  kpis: {
    totalProducts: number;
    lowStockCount: number;
    inventoryValueCents: number;
    movementsThisMonth: number;
  };
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("inventory");

  const [tab, setTab] = useState<"products" | "suppliers" | "movements">("products");

  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
  const [productFormState, setProductFormState] = useState<
    { mode: "create" } | { mode: "edit"; productId: string } | null
  >(null);
  const [supplierFormState, setSupplierFormState] = useState<
    { mode: "create" } | { mode: "edit"; supplierId: string } | null
  >(null);
  const [movementFormState, setMovementFormState] = useState<
    { fixedProductId: string | null } | null
  >(null);

  const suppliersById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers]
  );
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const viewingProduct = viewingProductId
    ? (products.find((product) => product.id === viewingProductId) ?? null)
    : null;

  const editingProduct =
    productFormState?.mode === "edit"
      ? (products.find((product) => product.id === productFormState.productId) ?? null)
      : null;

  const editingSupplier =
    supplierFormState?.mode === "edit"
      ? (suppliers.find((supplier) => supplier.id === supplierFormState.supplierId) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <KpiCards
        totalProducts={kpis.totalProducts}
        lowStockCount={kpis.lowStockCount}
        inventoryValueCents={kpis.inventoryValueCents}
        movementsThisMonth={kpis.movementsThisMonth}
        currency={currency}
        locale={locale}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductsValueChart
          products={products.filter((product) => product.is_active)}
          currency={currency}
          locale={locale}
          title={t("charts.productsValue.title")}
          emptyTitle={t("charts.productsValue.emptyTitle")}
        />
        <StockMovementsChart points={stockMovementTrend} />
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="products">{t("tabs.products")}</TabsTrigger>
            <TabsTrigger value="suppliers">{t("tabs.suppliers")}</TabsTrigger>
            <TabsTrigger value="movements">{t("tabs.movements")}</TabsTrigger>
          </TabsList>

          {tab === "products" && (
            <Button onClick={() => setProductFormState({ mode: "create" })}>
              <Plus size={16} />
              {t("products.createButton")}
            </Button>
          )}
        </div>

        <TabsContent value="products">
          <ProductsTable
            products={products}
            currency={currency}
            locale={locale}
            onView={(product) => setViewingProductId(product.id)}
            onEdit={(product) => setProductFormState({ mode: "edit", productId: product.id })}
            onCreate={() => setProductFormState({ mode: "create" })}
          />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab
            suppliers={suppliers}
            onCreate={() => setSupplierFormState({ mode: "create" })}
            onEdit={(supplier) =>
              setSupplierFormState({ mode: "edit", supplierId: supplier.id })
            }
          />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovementsTab
            movements={movements}
            productsById={productsById}
            timezone={timezone}
            locale={locale}
            onCreate={() => setMovementFormState({ fixedProductId: null })}
          />
        </TabsContent>
      </Tabs>

      <ProductDetailPanel
        open={viewingProductId !== null}
        onOpenChange={(open) => !open && setViewingProductId(null)}
        product={viewingProduct}
        supplierName={
          viewingProduct?.supplier_id
            ? (suppliersById.get(viewingProduct.supplier_id)?.name ?? null)
            : null
        }
        currency={currency}
        locale={locale}
        onEdit={() => {
          if (!viewingProduct) return;
          setProductFormState({ mode: "edit", productId: viewingProduct.id });
          setViewingProductId(null);
        }}
        onRegisterMovement={() => {
          if (!viewingProduct) return;
          setMovementFormState({ fixedProductId: viewingProduct.id });
          setViewingProductId(null);
        }}
      />

      <ProductFormPanel
        open={productFormState !== null}
        onOpenChange={(open) => !open && setProductFormState(null)}
        product={editingProduct}
        suppliers={suppliers}
        currency={currency}
      />

      <SupplierFormPanel
        open={supplierFormState !== null}
        onOpenChange={(open) => !open && setSupplierFormState(null)}
        supplier={editingSupplier}
      />

      <StockMovementFormPanel
        open={movementFormState !== null}
        onOpenChange={(open) => !open && setMovementFormState(null)}
        products={products.filter((product) => product.is_active)}
        fixedProductId={movementFormState?.fixedProductId ?? null}
      />
    </div>
  );
}
