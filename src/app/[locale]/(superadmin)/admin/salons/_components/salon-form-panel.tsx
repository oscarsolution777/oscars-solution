"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import {
  createDemoSalonSchema,
  type CreateDemoSalonInput,
} from "@/lib/validations/platform-salon";
import { createSalonAction, createDemoSalonAction } from "../actions";
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

type CurrencyRow = Tables<"currencies">;
type FormValues = CreateDemoSalonInput;

const LOCALE_LABELS: Record<string, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};

export function SalonFormPanel({
  open,
  onOpenChange,
  mode,
  currencies,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "real" | "demo";
  currencies: CurrencyRow[];
  onCreated: (credentials: { email: string; temporaryPassword: string }) => void;
}) {
  const t = useTranslations(
    mode === "demo" ? "superadmin.salons.createDemoForm" : "superadmin.salons.createRealForm"
  );
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const defaults: FormValues = {
    name: "",
    slug: "",
    phone: "",
    address: "",
    timezone: "America/Guyana",
    currency: currencies[0]?.code ?? "",
    defaultLocale: "es",
    ownerFullName: "",
    ownerEmail: "",
    demoDurationDays: "3",
  };

  // El resolver siempre valida contra el esquema demo (superconjunto): en
  // modo "real" el campo demoDurationDays no se renderiza ni se envía al
  // servidor, pero su default (3) siempre es válido, así que no hace falta
  // un segundo tipo de formulario solo para evitar un campo oculto.
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createDemoSalonSchema),
    defaultValues: defaults,
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(defaults);
    }
  }

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("slug", data.slug);
    formData.set("phone", data.phone ?? "");
    formData.set("address", data.address ?? "");
    formData.set("timezone", data.timezone);
    formData.set("currency", data.currency);
    formData.set("defaultLocale", data.defaultLocale);
    formData.set("ownerFullName", data.ownerFullName);
    formData.set("ownerEmail", data.ownerEmail);
    if (mode === "demo") {
      formData.set("demoDurationDays", data.demoDurationDays);
    }

    startTransition(async () => {
      const result =
        mode === "demo"
          ? await createDemoSalonAction(formData)
          : await createSalonAction(formData);

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      onOpenChange(false);
      onCreated(result.data);
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
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-danger">{t("nameError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">{t("slugLabel")}</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-xs text-danger">{t("slugError")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phoneLabel")}</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">{t("addressLabel")}</Label>
              <Input id="address" {...register("address")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
            <Input id="timezone" {...register("timezone")} />
            {errors.timezone && (
              <p className="text-xs text-danger">{t("timezoneError")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t("currencyLabel")}</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      currencies.map((currency) => [currency.code, currency.code])
                    )}
                  >
                    <SelectTrigger id="currency" className="w-full">
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
              {errors.currency && (
                <p className="text-xs text-danger">{t("currencyError")}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="defaultLocale">{t("defaultLocaleLabel")}</Label>
              <Controller
                control={control}
                name="defaultLocale"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={Object.fromEntries(
                      routing.locales.map((code) => [code, LOCALE_LABELS[code]])
                    )}
                  >
                    <SelectTrigger id="defaultLocale" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {routing.locales.map((code) => (
                        <SelectItem key={code} value={code}>
                          {LOCALE_LABELS[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {mode === "demo" && (
            <div className="space-y-1.5">
              <Label htmlFor="demoDurationDays">{t("demoDurationLabel")}</Label>
              <Input
                id="demoDurationDays"
                type="number"
                min={1}
                max={30}
                {...register("demoDurationDays")}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ownerFullName">{t("ownerFullNameLabel")}</Label>
            <Input id="ownerFullName" {...register("ownerFullName")} />
            {errors.ownerFullName && (
              <p className="text-xs text-danger">{t("ownerFullNameError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ownerEmail">{t("ownerEmailLabel")}</Label>
            <Input id="ownerEmail" type="email" {...register("ownerEmail")} />
            {errors.ownerEmail && (
              <p className="text-xs text-danger">{t("ownerEmailError")}</p>
            )}
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
