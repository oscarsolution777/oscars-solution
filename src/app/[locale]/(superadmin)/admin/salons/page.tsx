import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { listAllSalons } from "@/lib/db/platform-salons";
import { listCurrencies } from "@/lib/db/platform-currencies";
import { SalonsView } from "./_components/salons-view";

export default async function AdminSalonsPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  // Corrige demos vencidas antes de mostrar la lista (Fase 9A, ver
  // src/lib/auth/session.ts para el mismo chequeo en el login del panel).
  try {
    await supabase.rpc("expire_due_demo_salons");
  } catch {
    // best-effort
  }

  const [salons, currencies] = await Promise.all([
    listAllSalons(supabase),
    listCurrencies(supabase),
  ]);

  return (
    <SalonsView
      salons={salons}
      currencies={currencies.filter((currency) => currency.is_active)}
      locale={locale}
    />
  );
}
