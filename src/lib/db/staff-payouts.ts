import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, staff_id, period_start, period_end, base_cents, bonus_cents, total_cents, status, paid_at, created_at, updated_at";

export async function listStaffPayouts(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("staff_payouts")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("period_start", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createStaffPayoutRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    staffId: string;
    periodStart: string;
    periodEnd: string;
    baseCents: number;
    bonusCents: number;
  }
) {
  const { data, error } = await supabase
    .from("staff_payouts")
    .insert({
      salon_id: input.salonId,
      staff_id: input.staffId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      base_cents: input.baseCents,
      bonus_cents: input.bonusCents,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaffPayoutRow(
  supabase: SupabaseServerClient,
  payoutId: string,
  input: {
    periodStart?: string;
    periodEnd?: string;
    baseCents?: number;
    bonusCents?: number;
    status?: string;
    paidAt?: string | null;
  }
) {
  const patch: TablesUpdate<"staff_payouts"> = {};
  if (input.periodStart !== undefined) patch.period_start = input.periodStart;
  if (input.periodEnd !== undefined) patch.period_end = input.periodEnd;
  if (input.baseCents !== undefined) patch.base_cents = input.baseCents;
  if (input.bonusCents !== undefined) patch.bonus_cents = input.bonusCents;
  if (input.status !== undefined) patch.status = input.status;
  if (input.paidAt !== undefined) patch.paid_at = input.paidAt;

  const { data, error } = await supabase
    .from("staff_payouts")
    .update(patch)
    .eq("id", payoutId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
