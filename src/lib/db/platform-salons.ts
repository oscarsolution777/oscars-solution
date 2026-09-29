import type { createClient } from "@/lib/supabase/server";
import type { createAdminClient } from "@/lib/supabase/admin";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

const SELECT_COLUMNS =
  "id, name, slug, logo_url, phone, address, timezone, currency, default_locale, is_active, subscription_status, is_demo, demo_expires_at, created_at, updated_at";

// Panel SuperAdmin: ve todos los salones (RLS ya lo permite vía
// is_platform_admin() en salons_select_member_or_admin, 0003).
export async function listAllSalons(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from("salons")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createSalonRow(
  supabase: SupabaseServerClient,
  input: {
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    timezone: string;
    currency: string;
    defaultLocale: string;
    isDemo: boolean;
    demoExpiresAt: string | null;
  }
) {
  const { data, error } = await supabase
    .from("salons")
    .insert({
      name: input.name,
      slug: input.slug,
      phone: input.phone,
      address: input.address,
      timezone: input.timezone,
      currency: input.currency,
      default_locale: input.defaultLocale,
      is_demo: input.isDemo,
      demo_expires_at: input.demoExpiresAt,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export type SalonResetCounts = {
  requests: number;
  appointments: number;
  payments: number;
  cash_closures: number;
  stock_movements: number;
  expenses: number;
  staff_payouts: number;
  clients: number;
  ai_analyses?: number;
};

// Conteo por tabla antes de borrar, para que el diálogo de confirmación
// muestre el impacto real (CLAUDE.md sección 12: acciones destructivas
// siempre con confirmación — para un borrado sin vuelta atrás, un solo
// AlertDialog como el de suspender no basta).
export async function getSalonResetPreview(
  supabase: SupabaseServerClient,
  salonId: string
): Promise<SalonResetCounts> {
  const { data, error } = await supabase.rpc("get_salon_reset_preview", {
    p_salon_id: salonId,
  });
  if (error) throw error;

  const result = data as { ok: boolean; error?: string; counts?: SalonResetCounts };
  if (!result.ok) throw new Error(result.error ?? "forbidden");
  return result.counts as SalonResetCounts;
}

// Borrado destructivo real. La función SQL ya valida is_platform_admin() y
// que el salón exista; aquí solo se propaga el resultado.
export async function resetSalonData(
  supabase: SupabaseServerClient,
  salonId: string
): Promise<SalonResetCounts> {
  const { data, error } = await supabase.rpc("reset_salon_data", {
    p_salon_id: salonId,
  });
  if (error) throw error;

  const result = data as { ok: boolean; error?: string; deleted?: SalonResetCounts };
  if (!result.ok) throw new Error(result.error ?? "forbidden");
  return result.deleted as SalonResetCounts;
}

export async function updateSalonStatus(
  supabase: SupabaseServerClient,
  salonId: string,
  subscriptionStatus: "trial" | "active" | "suspended" | "cancelled"
) {
  const { data, error } = await supabase
    .from("salons")
    .update({ subscription_status: subscriptionStatus })
    .eq("id", salonId)
    .select(SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// Crea el usuario de Supabase Auth para la dueña de un salón nuevo (real o
// demo) y su membership owner. Mismo patrón que scripts/seed-demo-user.mjs,
// ahora reutilizable desde una Server Action. Requiere el cliente
// service-role: no hay flujo de autoregistro para dueñas todavía.
export async function createOwnerAccountForSalon(
  adminClient: SupabaseAdminClient,
  input: { email: string; fullName: string; locale: string; salonId: string }
) {
  const temporaryPassword = crypto.randomUUID().slice(0, 12);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, locale: input.locale },
  });
  if (createError) throw createError;

  const { error: membershipError } = await adminClient.from("memberships").insert({
    user_id: created.user.id,
    salon_id: input.salonId,
    role: "owner",
    is_active: true,
  });
  if (membershipError) throw membershipError;

  return { userId: created.user.id, temporaryPassword };
}

// Clona el catálogo (categorías + servicios) del salón piloto hacia un salón
// demo nuevo. No clona staff/products/suppliers (quedan vacíos para que el
// prospecto cargue los suyos). Sin salon_id propio a mapear en service_staff
// porque no se clonan trabajadores.
export async function cloneCatalogToSalon(
  supabase: SupabaseServerClient,
  fromSalonId: string,
  toSalonId: string
) {
  const { data: categories, error: categoriesError } = await supabase
    .from("service_categories")
    .select("id, name, sort_order, is_active")
    .eq("salon_id", fromSalonId)
    .order("sort_order", { ascending: true });
  if (categoriesError) throw categoriesError;
  if (!categories || categories.length === 0) return;

  const { data: insertedCategories, error: insertCategoriesError } = await supabase
    .from("service_categories")
    .insert(
      categories.map((category) => ({
        salon_id: toSalonId,
        name: category.name,
        sort_order: category.sort_order,
        is_active: category.is_active,
      }))
    )
    .select("id, name, sort_order");
  if (insertCategoriesError) throw insertCategoriesError;

  // Empareja categoría vieja -> nueva por (name, sort_order): es única dentro
  // del catálogo de origen y evita depender del orden de retorno del insert.
  const newCategoryIdByKey = new Map(
    (insertedCategories ?? []).map((category) => [
      `${category.name}::${category.sort_order}`,
      category.id,
    ])
  );

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select(
      "category_id, name, description, features, price_cents, duration_min, image_url, is_active, sort_order"
    )
    .eq("salon_id", fromSalonId);
  if (servicesError) throw servicesError;
  if (!services || services.length === 0) return;

  const oldCategoryKeyById = new Map(
    categories.map((category) => [category.id, `${category.name}::${category.sort_order}`])
  );

  const servicesToInsert = services
    .map((service) => {
      const key = oldCategoryKeyById.get(service.category_id);
      const newCategoryId = key ? newCategoryIdByKey.get(key) : undefined;
      if (!newCategoryId) return null;
      return {
        salon_id: toSalonId,
        category_id: newCategoryId,
        name: service.name,
        description: service.description,
        features: service.features,
        price_cents: service.price_cents,
        duration_min: service.duration_min,
        // La imagen del catálogo de origen no se copia al storage del salón
        // nuevo: queda sin imagen hasta que el prospecto suba la suya.
        image_url: null,
        is_active: service.is_active,
        sort_order: service.sort_order,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (servicesToInsert.length === 0) return;

  const { error: insertServicesError } = await supabase
    .from("services")
    .insert(servicesToInsert);
  if (insertServicesError) throw insertServicesError;
}
