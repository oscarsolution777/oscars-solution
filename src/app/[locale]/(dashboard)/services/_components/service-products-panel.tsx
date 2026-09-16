"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import type { Tables } from "@/types/database";
import { setServiceProductsAction } from "../actions";

type ServiceRow = Tables<"services">;
type ProductRow = Tables<"products">;

export function ServiceProductsPanel({
  open,
  onOpenChange,
  service,
  products,
  assignedQtyByProductId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRow | null;
  products: ProductRow[];
  assignedQtyByProductId: Map<string, number>;
}) {
  const t = useTranslations("services.productsForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, string>>(
    new Map(Array.from(assignedQtyByProductId, ([id, qty]) => [id, String(qty)]))
  );
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      setSelected(new Map(Array.from(assignedQtyByProductId, ([id, qty]) => [id, String(qty)])));
    }
  }

  if (!service) return null;

  const toggleProduct = (productId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(productId, next.get(productId) ?? "1");
      else next.delete(productId);
      return next;
    });
  };

  const setQty = (productId: string, qty: string) => {
    setSelected((current) => {
      const next = new Map(current);
      next.set(productId, qty);
      return next;
    });
  };

  const handleSave = () => {
    setServerError(null);
    startTransition(async () => {
      const result = await setServiceProductsAction(
        service.id,
        Array.from(selected, ([productId, qty]) => ({ productId, qty }))
      );
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
          <SheetTitle>{t("title", { name: service.name })}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-1 px-4">
          {products.length === 0 ? (
            <EmptyState title={t("noActiveProducts")} />
          ) : (
            products.map((product) => {
              const isSelected = selected.has(product.id);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted"
                >
                  <Label htmlFor={`product-${product.id}`} className="cursor-pointer font-normal">
                    {product.name}
                  </Label>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Input
                        type="number"
                        min={1}
                        className="h-8 w-16"
                        value={selected.get(product.id) ?? "1"}
                        onChange={(event) => setQty(product.id, event.target.value)}
                        aria-label={t("qtyLabel", { name: product.name })}
                      />
                    )}
                    <Switch
                      id={`product-${product.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => toggleProduct(product.id, checked)}
                    />
                  </div>
                </div>
              );
            })
          )}

          {serverError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {t("genericError")}
            </p>
          )}
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? tCommon("loading") : tCommon("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
