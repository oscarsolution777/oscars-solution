"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  subscriptionPriceSchema,
  type SubscriptionPriceInput,
} from "@/lib/validations/platform-currency";
import { setSubscriptionPriceAction } from "../actions";
import type { Tables } from "@/types/database";
import {
  Sheet,
  SheetContent,
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

type CurrencyRow = Tables<"currencies">;

export function SubscriptionPriceFormPanel({
  open,
  onOpenChange,
  currencies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencies: CurrencyRow[];
}) {
  const t = useTranslations("superadmin.currencies.priceForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const defaults: SubscriptionPriceInput = {
    currencyCode: currencies[0]?.code ?? "",
    price: "",
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubscriptionPriceInput>({
    resolver: zodResolver(subscriptionPriceSchema),
    defaultValues: defaults,
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(defaults);
    }
  }

  const onSubmit = (data: SubscriptionPriceInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("currencyCode", data.currencyCode);
    formData.set("price", data.price);

    startTransition(async () => {
      const result = await setSubscriptionPriceAction(formData);
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
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="currencyCode">{t("currencyLabel")}</Label>
            <Controller
              control={control}
              name="currencyCode"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={Object.fromEntries(
                    currencies.map((currency) => [currency.code, currency.code])
                  )}
                >
                  <SelectTrigger id="currencyCode" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">{t("priceLabel")}</Label>
            <Input id="price" inputMode="decimal" {...register("price")} />
            {errors.price && <p className="text-xs text-danger">{t("priceError")}</p>}
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
