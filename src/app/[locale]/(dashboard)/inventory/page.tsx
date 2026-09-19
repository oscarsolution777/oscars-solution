import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/db/products";
import { listSuppliers } from "@/lib/db/suppliers";
import { listStockMovements } from "@/lib/db/stock-movements";
import { getPresetRange } from "@/lib/utils/period";
import { computeStockMovementTrend } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryView } from "./_components/inventory-view";

export default async function InventoryPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const [products, suppliers, movements] = await Promise.all([
    listProducts(supabase, salon.id),
    listSuppliers(supabase, salon.id),
    listStockMovements(supabase, salon.id),
  ]);

  const activeProducts = products.filter((product) => product.is_active);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const lowStockCount = activeProducts.filter(
    (product) => product.stock_qty <= product.min_stock
  ).length;
  const inventoryValueCents = activeProducts.reduce(
    (sum, product) => sum + product.stock_qty * product.cost_cents,
    0
  );
  const movementsThisMonth = movements.filter(
    (movement) => new Date(movement.created_at) >= startOfMonth
  ).length;

  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const { from, to } = getPresetRange("last3Months", todayStr);
  const stockMovementTrend = computeStockMovementTrend(movements, from, to, salon.timezone);

  return (
    <InventoryView
      products={products}
      suppliers={suppliers}
      movements={movements}
      stockMovementTrend={stockMovementTrend}
      kpis={{
        totalProducts: activeProducts.length,
        lowStockCount,
        inventoryValueCents,
        movementsThisMonth,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
