import type { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SELECT_COLUMNS =
  "id, salon_id, user_id, full_name, phone, role_title, base_salary_cents, hired_at, is_active, created_at, updated_at";

export async function listStaff(supabase: SupabaseServerClient, salonId: string) {
  const { data, error } = await supabase
    .from("staff")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createStaffRow(
  supabase: SupabaseServerClient,
  input: {
    salonId: string;
    fullName: string;
    roleTitle: string;
    phone: string | null;
    baseSalaryCents: number;
    hiredAt: string;
  }
) {
  const { data, error } = await supabase
    .from("staff")
    .insert({
      salon_id: input.salonId,
      full_name: input.fullName,
      role_title: input.roleTitle,
      phone: input.phone,
      base_salary_cents: input.baseSalaryCents,
      hired_at: input.hiredAt,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStaffRow(
  supabase: SupabaseServerClient,
  staffId: string,
  input: {
    fullName?: string;
    roleTitle?: string;
    phone?: string | null;
    baseSalaryCents?: number;
    hiredAt?: string;
    isActive?: boolean;
  }
) {
  const patch: TablesUpdate<"staff"> = {};
  if (input.fullName !== undefined) patch.full_name = input.fullName;
  if (input.roleTitle !== undefined) patch.role_title = input.roleTitle;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.baseSalaryCents !== undefined) patch.base_salary_cents = input.baseSalaryCents;
  if (input.hiredAt !== undefined) patch.hired_at = input.hiredAt;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { data, error } = await supabase
    .from("staff")
    .update(patch)
    .eq("id", staffId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
