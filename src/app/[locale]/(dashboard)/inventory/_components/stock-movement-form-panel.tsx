"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  stockMovementSchema,
  stockMovementTypes,
  stockMovementDirections,
  type StockMovementInput,
} from "@/lib/validations/stock-movements";
import { createStockMovementAction } from "../actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProductRow = Tables<"products">;

export function StockMovementFormPanel({
  open,
  onOpenChange,
  products,
  fixedProductId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductRow[];
  fixedProductId: string | null;
}) {
  const t = useTranslations("inventory.movements.form");
  const tTypes = useTranslations("inventory.movements.types");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const buildDefaults = (): StockMovementInput => ({
    productId: fixedProductId ?? products[0]?.id ?? "",
    type: "in",
    qty: "1",
    direction: "increase",
    reason: "",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StockMovementInput>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const selectedType = useWatch({ control, name: "type" });
  const fixedProduct = fixedProductId
    ? (products.find((product) => product.id === fixedProductId) ?? null)
    : null;

  const onSubmit = (data: StockMovementInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("productId", data.productId);
    formData.set("type", data.type);
    formData.set("qty", data.qty);
    if (data.type === "adjustment" && data.direction) {
      formData.set("direction", data.direction);
    }
    formData.set("reason", data.reason ?? "");

    startTransition(async () => {
      const result = await createStockMovementAction(formData);

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
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="productId">{t("productLabel")}</Label>
            {fixedProduct ? (
              <Input id="productId" value={fixedProduct.name} disabled readOnly />
            ) : (
              <Controller
                control={control}
                name="productId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(products.map((product) => [product.id, product.name]))}
                  >
                    <SelectTrigger id="productId" className="w-full">
                      <SelectValue placeholder={t("productPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.productId && (
              <p className="text-xs text-danger">{t("productError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">{t("typeLabel")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={Object.fromEntries(stockMovementTypes.map((type) => [type, tTypes(type)]))}
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stockMovementTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {tTypes(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {selectedType === "adjustment" && (
            <div className="space-y-1.5">
              <Label htmlFor="direction">{t("directionLabel")}</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      stockMovementDirections.map((direction) => [direction, t(`directions.${direction}`)])
                    )}
                  >
                    <SelectTrigger id="direction" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stockMovementDirections.map((direction) => (
                        <SelectItem key={direction} value={direction}>
                          {t(`directions.${direction}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="qty">{t("qtyLabel")}</Label>
            <Input id="qty" inputMode="numeric" {...register("qty")} />
            {errors.qty && <p className="text-xs text-danger">{t("qtyError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">{t("reasonLabel")}</Label>
            <Textarea id="reason" rows={2} {...register("reason")} />
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-danger">
              {t(serverError.endsWith("insufficientStock") ? "insufficientStockError" : "genericError")}
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
