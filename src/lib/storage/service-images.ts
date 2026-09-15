import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const BUCKET = "service-images";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Convención de ruta <salon_id>/<uuid>.<ext> — es la que leen las políticas
// RLS de storage.objects en la migración 0004 vía storage.foldername(name).
export async function uploadServiceImage(
  supabase: SupabaseServerClient,
  salonId: string,
  file: File
): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.type];
  if (!extension) throw new Error("unsupported_image_type");

  const path = `${salonId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}

export async function deleteServiceImage(
  supabase: SupabaseServerClient,
  imageUrl: string
) {
  const path = extractStoragePath(imageUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

function extractStoragePath(imageUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(imageUrl.slice(index + marker.length));
}
