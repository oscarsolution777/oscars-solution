"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  serviceCategorySchema,
  type ServiceCategoryInput,
} from "@/lib/validations/service-categories";
import {
  serviceSchema,
  serviceImageSchema,
  parseDurationMin,
  parseFeatures,
  priceToCents,
} from "@/lib/validations/services";
import {
  createServiceCategory,
  getNextCategorySortOrder,
  updateServiceCategory,
} from "@/lib/db/service-categories";
import {
  createService,
  getNextServiceSortOrder,
  getServiceById,
  updateService,
} from "@/lib/db/services";
import { deleteServiceImage, uploadServiceImage } from "@/lib/storage/service-images";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const WRITE_ROLES = ["owner", "admin"] as const;

async function requireCatalogWriteAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  if (!WRITE_ROLES.includes(activeMembership.role as (typeof WRITE_ROLES)[number])) {
    return { ok: false as const, error: "services.errors.forbidden" };
  }

  return { ok: true as const, salonId: activeMembership.salon!.id };
}

export async function createCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  const parsed = serviceCategorySchema.safeParse({
    name: formData.get("name"),
  } satisfies Record<keyof ServiceCategoryInput, unknown>);

  if (!parsed.success) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    const sortOrder = await getNextCategorySortOrder(supabase, access.salonId);
    await createServiceCategory(supabase, {
      salonId: access.salonId,
      name: parsed.data.name,
      sortOrder,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}

export async function updateCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  const categoryId = formData.get("categoryId");
  if (typeof categoryId !== "string" || categoryId.length === 0) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  const parsed = serviceCategorySchema.safeParse({
    name: formData.get("name"),
  } satisfies Record<keyof ServiceCategoryInput, unknown>);

  if (!parsed.success) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateServiceCategory(supabase, categoryId, { name: parsed.data.name });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}

export async function setCategoryActiveAction(
  categoryId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateServiceCategory(supabase, categoryId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}

export async function createServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  const parsed = serviceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    features: formData.get("features") ?? "",
    price: formData.get("price"),
    durationMin: formData.get("durationMin"),
  });

  if (!parsed.success) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  const imageFile = formData.get("image");
  let imageUrl: string | null = null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const imageParsed = serviceImageSchema.safeParse(imageFile);
    if (!imageParsed.success) {
      return { ok: false, error: "services.errors.invalidImage" };
    }
  }

  try {
    const supabase = await createClient();

    if (imageFile instanceof File && imageFile.size > 0) {
      imageUrl = await uploadServiceImage(supabase, access.salonId, imageFile);
    }

    const sortOrder = await getNextServiceSortOrder(supabase, access.salonId);

    await createService(supabase, {
      salonId: access.salonId,
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      features: parseFeatures(parsed.data.features),
      priceCents: priceToCents(parsed.data.price),
      durationMin: parseDurationMin(parsed.data.durationMin),
      imageUrl,
      sortOrder,
    });

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}

export async function updateServiceAction(
  formData: FormData
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  const serviceId = formData.get("serviceId");
  if (typeof serviceId !== "string" || serviceId.length === 0) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  const parsed = serviceSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    features: formData.get("features") ?? "",
    price: formData.get("price"),
    durationMin: formData.get("durationMin"),
  });

  if (!parsed.success) {
    return { ok: false, error: "services.errors.invalidInput" };
  }

  const imageFile = formData.get("image");
  const hasNewImage = imageFile instanceof File && imageFile.size > 0;

  if (hasNewImage) {
    const imageParsed = serviceImageSchema.safeParse(imageFile);
    if (!imageParsed.success) {
      return { ok: false, error: "services.errors.invalidImage" };
    }
  }

  try {
    const supabase = await createClient();
    const existing = await getServiceById(supabase, serviceId);

    let imageUrl = existing.image_url;
    if (hasNewImage && imageFile instanceof File) {
      imageUrl = await uploadServiceImage(supabase, access.salonId, imageFile);
    }

    await updateService(supabase, serviceId, {
      categoryId: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      features: parseFeatures(parsed.data.features),
      priceCents: priceToCents(parsed.data.price),
      durationMin: parseDurationMin(parsed.data.durationMin),
      imageUrl,
    });

    if (hasNewImage && existing.image_url) {
      try {
        await deleteServiceImage(supabase, existing.image_url);
      } catch {
        // Best-effort: la imagen anterior queda huérfana en storage, pero la
        // mutación principal (la fila del servicio) ya se aplicó con éxito.
      }
    }

    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}

export async function setServiceActiveAction(
  serviceId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireCatalogWriteAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateService(supabase, serviceId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "services.errors.generic" };
  }
}
