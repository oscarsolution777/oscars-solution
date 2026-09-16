import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { listCurrencies, listSubscriptionPrices } from "@/lib/db/platform-currencies";
import { CurrenciesView } from "./_components/currencies-view";

export default async function AdminCurrenciesPage() {
  const locale = await getLocale();
  const supabase = await createClient();

  const [currencies, prices] = await Promise.all([
    listCurrencies(supabase),
    listSubscriptionPrices(supabase),
  ]);

  return <CurrenciesView currencies={currencies} prices={prices} locale={locale} />;
}
