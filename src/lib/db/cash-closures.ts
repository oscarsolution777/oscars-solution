import { fromZonedTime } from "date-fns-tz";
import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, closure_date, opening_cash_cents, expected_cash_cents, counted_cash_cents, difference_cents, notes, closed_by, closed_at, created_at, updated_at";

export async function listCashClosures(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("cash_closures")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("closure_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createCashClosureRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    closureDate: string;
    openingCashCents: number;
    countedCashCents: number;
    notes: string | null;
    closedBy: string | null;
  }
) {
  const { data, error } = await supabase
    .from("cash_closures")
    .insert({
      salon_id: input.salonId,
      closure_date: input.closureDate,
      opening_cash_cents: input.openingCashCents,
      counted_cash_cents: input.countedCashCents,
      notes: input.notes,
      closed_by: input.closedBy,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCashClosureRow(
  supabase: SupabaseServerClient,
  closureId: string,
  input: {
    countedCashCents?: number;
    notes?: string | null;
  }
) {
  const patch: TablesUpdate<"cash_closures"> = {};
  if (input.countedCashCents !== undefined) patch.counted_cash_cents = input.countedCashCents;
  if (input.notes !== undefined) patch.notes = input.notes;

  const { data, error } = await supabase
    .from("cash_closures")
    .update(patch)
    .eq("id", closureId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Vista previa de "efectivo esperado" antes de crear el cuadre: misma
// fórmula que el trigger apply_cash_closure_computed (opening + pagos en
// efectivo/pagados de ese día en la zona horaria del salón), calculada aquí
// en JS solo para mostrarla en el formulario antes de guardar — el valor
// que realmente queda guardado siempre lo fija el trigger en la base.
export async function previewExpectedCashCents(
  supabase: SupabaseServerClient,
  salonId: string,
  closureDate: string,
  timezone: string
): Promise<number> {
  const dayStart = fromZonedTime(`${closureDate}T00:00:00`, timezone);
  const dayEnd = fromZonedTime(`${closureDate}T23:59:59.999`, timezone);

  const { data, error } = await supabase
    .from("payments")
    .select("amount_cents")
    .eq("salon_id", salonId)
    .eq("method", "cash")
    .eq("status", "paid")
    .gte("paid_at", dayStart.toISOString())
    .lte("paid_at", dayEnd.toISOString());

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.amount_cents, 0);
}
