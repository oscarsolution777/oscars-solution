"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  createCurrencySchema,
  type CreateCurrencyInput,
} from "@/lib/validations/platform-currency";
import { createCurrencyAction } from "../actions";
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

export function CurrencyFormPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("superadmin.currencies.currencyForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCurrencyInput>({
    resolver: zodResolver(createCurrencySchema),
    defaultValues: { code: "", name: "", symbol: "" },
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset({ code: "", name: "", symbol: "" });
    }
  }

  const onSubmit = (data: CreateCurrencyInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("code", data.code);
    formData.set("name", data.name);
    formData.set("symbol", data.symbol);

    startTransition(async () => {
      const result = await createCurrencyAction(formData);
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
            <Label htmlFor="code">{t("codeLabel")}</Label>
            <Input id="code" maxLength={3} {...register("code")} />
            {errors.code && <p className="text-xs text-danger">{t("codeError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{t("nameError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="symbol">{t("symbolLabel")}</Label>
            <Input id="symbol" {...register("symbol")} />
            {errors.symbol && <p className="text-xs text-danger">{t("symbolError")}</p>}
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
