"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { productSchema, productUnits, type ProductInput } from "@/lib/validations/products";
import { createProductAction, updateProductAction } from "../actions";
import type { Tables } from "@/types/database";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductRow = Tables<"products">;
type SupplierRow = Tables<"suppliers">;

const NO_SUPPLIER_VALUE = "none";

export function ProductFormPanel({
  open,
  onOpenChange,
  product,
  suppliers,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductRow | null;
  suppliers: SupplierRow[];
  currency: string;
}) {
  const t = useTranslations("inventory.products.form");
  const tUnits = useTranslations("inventory.products.units");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(product);

  const buildDefaults = (): ProductInput => ({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    unit: (product?.unit as ProductInput["unit"]) ?? "unit",
    minStock: product ? String(product.min_stock) : "0",
    cost: product ? (product.cost_cents / 100).toFixed(2) : "",
    price: product ? (product.price_cents / 100).toFixed(2) : "",
    supplierId: product?.supplier_id ?? "",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: buildDefaults(),
  });

  // Reinicia el formulario cada vez que el panel pasa de cerrado a abierto
  // (patrón "adjust state during render", evita el lint set-state-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: ProductInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("sku", data.sku ?? "");
    formData.set("unit", data.unit);
    formData.set("minStock", data.minStock);
    formData.set("cost", data.cost);
    formData.set("price", data.price);
    formData.set("supplierId", data.supplierId ?? "");
    if (product) formData.set("productId", product.id);

    startTransition(async () => {
      const result = product
        ? await updateProductAction(formData)
        : await createProductAction(formData);

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? t("editTitle") : t("createTitle")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{t("nameError")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku">{t("skuLabel")}</Label>
              <Input id="sku" {...register("sku")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">{t("unitLabel")}</Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="unit" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {productUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {tUnits(unit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplierId">{t("supplierLabel")}</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select
                  value={field.value || NO_SUPPLIER_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NO_SUPPLIER_VALUE ? "" : value)
                  }
                >
                  <SelectTrigger id="supplierId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER_VALUE}>{t("noSupplier")}</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                        {!supplier.is_active ? ` (${tCommon("inactive")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="minStock">{t("minStockLabel")}</Label>
              <Input id="minStock" inputMode="numeric" {...register("minStock")} />
              {errors.minStock && (
                <p className="text-xs text-danger">{t("minStockError")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">{t("costLabel", { currency })}</Label>
              <Input id="cost" inputMode="decimal" {...register("cost")} />
              {errors.cost && <p className="text-xs text-danger">{t("costError")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">{t("priceLabel", { currency })}</Label>
              <Input id="price" inputMode="decimal" {...register("price")} />
              {errors.price && <p className="text-xs text-danger">{t("priceError")}</p>}
            </div>
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-danger">
              {t("genericError")}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
