import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type AiChatMessageRow = Tables<"ai_chat_messages">;

const SELECT_COLUMNS = "id, salon_id, user_id, role, content, created_at";

// Solo se guardan los turnos de texto final (nunca las llamadas a
// herramientas intermedias de cada turno, ver src/lib/ai/tools/) -- el
// historial que ve el modelo en el siguiente mensaje es texto, no el
// mecanismo de tool-use.
export async function listChatMessages(
  supabase: SupabaseServerClient,
  salonId: string,
  limit = 50
): Promise<AiChatMessageRow[]> {
  const { data, error } = await supabase
    .from("ai_chat_messages")
    .select(SELECT_COLUMNS)
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).reverse();
}

// El límite de 20 mensajes/hora lo aplica el trigger check_ai_chat_rate_limit
// (migración 0024) en el insert de role='user' -- este error de Postgres
// (errcode P0001) se traduce a la clave de i18n en la Server Action.
export async function insertChatMessage(
  supabase: SupabaseServerClient,
  input: { salonId: string; userId: string; role: "user" | "assistant"; content: string }
): Promise<AiChatMessageRow> {
  const { data, error } = await supabase
    .from("ai_chat_messages")
    .insert({
      salon_id: input.salonId,
      user_id: input.userId,
      role: input.role,
      content: input.content,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}
