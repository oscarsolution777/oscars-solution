import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const CURRENCY_COLUMNS = "code, name, symbol, is_active, created_at, updated_at";
const PRICE_COLUMNS =
  "id, currency_code, price_cents, is_active, created_at, updated_at";

export async function listCurrencies(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("currencies")
    .select(CURRENCY_COLUMNS)
    .order("code", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCurrency(
  supabase: SupabaseServerClient,
  input: { code: string; name: string; symbol: string }
) {
  const { data, error } = await supabase
    .from("currencies")
    .insert({ code: input.code, name: input.name, symbol: input.symbol })
    .select(CURRENCY_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCurrencyActive(
  supabase: SupabaseServerClient,
  code: string,
  isActive: boolean
) {
  const { data, error } = await supabase
    .from("currencies")
    .update({ is_active: isActive })
    .eq("code", code)
    .select(CURRENCY_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function listSubscriptionPrices(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("subscription_prices")
    .select(PRICE_COLUMNS)
    .order("currency_code", { ascending: true });

  if (error) throw error;
  return data;
}

// Un solo precio activo por moneda (subscription_prices_active_currency_idx,
// 0002): desactiva el precio activo anterior de esa moneda antes de insertar
// el nuevo, en vez de reutilizar la fila (mantiene el histórico de precios).
export async function setActiveSubscriptionPrice(
  supabase: SupabaseServerClient,
  input: { currencyCode: string; priceCents: number }
) {
  const { error: deactivateError } = await supabase
    .from("subscription_prices")
    .update({ is_active: false })
    .eq("currency_code", input.currencyCode)
    .eq("is_active", true);
  if (deactivateError) throw deactivateError;

  const { data, error } = await supabase
    .from("subscription_prices")
    .insert({
      currency_code: input.currencyCode,
      price_cents: input.priceCents,
      is_active: true,
    })
    .select(PRICE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
