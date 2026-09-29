import { getLocale, getTranslations } from "next-intl/server";
import { formatInTimeZone } from "date-fns-tz";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/db/products";
import { listSuppliers } from "@/lib/db/suppliers";
import { listStockMovements } from "@/lib/db/stock-movements";
import { resolvePeriod } from "@/lib/utils/period";
import { formatCalendarDate } from "@/lib/utils/dates";
import { computeStockMovementTrend, inRange } from "@/lib/reports/aggregations";
import { EmptyState } from "@/components/shared/empty-state";
import { InventoryView } from "./_components/inventory-view";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
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

  const lowStockCount = activeProducts.filter(
    (product) => product.stock_qty <= product.min_stock
  ).length;
  const inventoryValueCents = activeProducts.reduce(
    (sum, product) => sum + product.stock_qty * product.cost_cents,
    0
  );

  const params = await searchParams;
  const todayStr = formatInTimeZone(new Date(), salon.timezone, "yyyy-MM-dd");
  const period = resolvePeriod(params, todayStr);
  const { from, to } = period;

  // created_at es timestamptz: se convierte a la zona horaria del salón antes
  // de compararlo con el periodo seleccionado (CLAUDE.md sección 5, "Fechas")
  // — mismo patrón ya usado dentro de computeStockMovementTrend.
  const movementsInPeriod = movements.filter((movement) =>
    inRange(formatInTimeZone(new Date(movement.created_at), salon.timezone, "yyyy-MM-dd"), from, to)
  ).length;
  const stockMovementTrend = computeStockMovementTrend(movements, from, to, salon.timezone);

  const tPeriod = await getTranslations("inventory.period");
  const periodLabel =
    period.preset === "custom"
      ? `${formatCalendarDate(period.from, locale, "P")} – ${formatCalendarDate(period.to, locale, "P")}`
      : tPeriod(period.preset);

  return (
    <InventoryView
      products={products}
      suppliers={suppliers}
      movements={movements}
      stockMovementTrend={stockMovementTrend}
      period={period}
      kpis={{
        totalProducts: activeProducts.length,
        lowStockCount,
        inventoryValueCents,
        movementsInPeriod,
      }}
      periodLabel={periodLabel}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
    />
  );
}
