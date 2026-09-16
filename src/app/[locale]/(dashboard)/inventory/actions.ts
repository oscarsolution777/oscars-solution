"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/auth/session";
import { supplierSchema } from "@/lib/validations/suppliers";
import { productSchema, parseStockQty } from "@/lib/validations/products";
import { stockMovementSchema, computeSignedQty } from "@/lib/validations/stock-movements";
import { parseMoneyToCents } from "@/lib/utils/money";
import { createSupplierRow, updateSupplierRow } from "@/lib/db/suppliers";
import { createProductRow, updateProductRow } from "@/lib/db/products";
import { createStockMovementRow } from "@/lib/db/stock-movements";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// CLAUDE.md sección 7: "Inventario" da a los 3 roles (owner/admin/reception)
// lectura Y escritura completa — igual que "Clientes", sin has_role_in_salon.
async function requireInventoryAccess() {
  const session = await getCurrentSession();
  const activeMembership = session?.activeMembership;

  if (!session || !activeMembership) {
    return { ok: false as const, error: "auth.login.noMembership" };
  }

  return {
    ok: true as const,
    salonId: activeMembership.salon!.id,
    userId: session.user.id,
  };
}

function isCheckViolation(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23514"
  );
}

// --- Proveedores -----------------------------------------------------------

export async function createSupplierAction(formData: FormData): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "inventory.suppliers.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createSupplierRow(supabase, {
      salonId: access.salonId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.suppliers.errors.generic" };
  }
}

export async function updateSupplierAction(formData: FormData): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  const supplierId = formData.get("supplierId");
  if (typeof supplierId !== "string" || supplierId.length === 0) {
    return { ok: false, error: "inventory.suppliers.errors.invalidInput" };
  }

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "inventory.suppliers.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateSupplierRow(supabase, supplierId, {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      notes: parsed.data.notes || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.suppliers.errors.generic" };
  }
}

export async function setSupplierActiveAction(
  supplierId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateSupplierRow(supabase, supplierId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.suppliers.errors.generic" };
  }
}

// --- Productos ---------------------------------------------------------------

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") ?? "",
    unit: formData.get("unit"),
    minStock: formData.get("minStock"),
    cost: formData.get("cost"),
    price: formData.get("price"),
    supplierId: formData.get("supplierId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "inventory.products.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createProductRow(supabase, {
      salonId: access.salonId,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      unit: parsed.data.unit,
      minStock: parseStockQty(parsed.data.minStock),
      costCents: parseMoneyToCents(parsed.data.cost),
      priceCents: parseMoneyToCents(parsed.data.price),
      supplierId: parsed.data.supplierId || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.products.errors.generic" };
  }
}

export async function updateProductAction(formData: FormData): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId.length === 0) {
    return { ok: false, error: "inventory.products.errors.invalidInput" };
  }

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") ?? "",
    unit: formData.get("unit"),
    minStock: formData.get("minStock"),
    cost: formData.get("cost"),
    price: formData.get("price"),
    supplierId: formData.get("supplierId") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "inventory.products.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await updateProductRow(supabase, productId, {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      unit: parsed.data.unit,
      minStock: parseStockQty(parsed.data.minStock),
      costCents: parseMoneyToCents(parsed.data.cost),
      priceCents: parseMoneyToCents(parsed.data.price),
      supplierId: parsed.data.supplierId || null,
    });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.products.errors.generic" };
  }
}

export async function setProductActiveAction(
  productId: string,
  isActive: boolean
): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  try {
    const supabase = await createClient();
    await updateProductRow(supabase, productId, { isActive });
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "inventory.products.errors.generic" };
  }
}

// --- Movimientos de stock ------------------------------------------------------

export async function createStockMovementAction(formData: FormData): Promise<ActionResult> {
  const access = await requireInventoryAccess();
  if (!access.ok) return access;

  const parsed = stockMovementSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    qty: formData.get("qty"),
    direction: formData.get("direction") || undefined,
    reason: formData.get("reason") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "inventory.movements.errors.invalidInput" };
  }

  try {
    const supabase = await createClient();
    await createStockMovementRow(supabase, {
      salonId: access.salonId,
      productId: parsed.data.productId,
      type: parsed.data.type,
      qty: computeSignedQty(parsed.data.type, parsed.data.qty, parsed.data.direction),
      reason: parsed.data.reason || null,
      createdBy: access.userId,
    });
    return { ok: true, data: undefined };
  } catch (error) {
    if (isCheckViolation(error) && error.message.includes("negativo")) {
      return { ok: false, error: "inventory.movements.errors.insufficientStock" };
    }
    return { ok: false, error: "inventory.movements.errors.generic" };
  }
}
