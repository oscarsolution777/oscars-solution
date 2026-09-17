"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { salonProfileSchema, SALON_TIMEZONES, type SalonProfileInput } from "@/lib/validations/salons";
import { updateSalonProfileAction } from "../actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { SalonLogoUploader } from "./salon-logo-uploader";
import { useSettingsErrorMessage } from "./use-settings-error-message";

const LOCALE_LABELS: Record<string, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};

type Salon = {
  name: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  timezone: string;
  default_locale: string;
  currency: string;
};

export function SalonProfileForm({ salon, isOwner }: { salon: Salon; isOwner: boolean }) {
  const t = useTranslations("settings.profile");
  const tCommon = useTranslations("common");
  const errorMessage = useSettingsErrorMessage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SalonProfileInput>({
    resolver: zodResolver(salonProfileSchema),
    defaultValues: {
      name: salon.name,
      phone: salon.phone ?? "",
      address: salon.address ?? "",
      timezone: salon.timezone,
      defaultLocale: salon.default_locale as SalonProfileInput["defaultLocale"],
    },
  });

  const onSubmit = (data: SalonProfileInput) => {
    setServerError(null);
    setSaved(false);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("phone", data.phone ?? "");
    formData.set("address", data.address ?? "");
    formData.set("timezone", data.timezone);
    formData.set("defaultLocale", data.defaultLocale);
    if (logoFile) formData.set("logo", logoFile);

    startTransition(async () => {
      const result = await updateSalonProfileAction(formData);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{isOwner ? t("subtitle") : t("readOnlySubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset disabled={!isOwner || isPending} className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <SalonLogoUploader initialLogoUrl={salon.logo_url} onFileChange={setLogoFile} />

            <div className="space-y-1.5">
              <Label htmlFor="name">{t("nameLabel")}</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{t("nameError")}</p>}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("phoneLabel")}</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">{t("addressLabel")}</Label>
                <Input id="address" {...register("address")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
                <Controller
                  control={control}
                  name="timezone"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={Object.fromEntries(SALON_TIMEZONES.map((tz) => [tz, tz]))}
                    >
                      <SelectTrigger id="timezone" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALON_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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
                      items={Object.fromEntries(routing.locales.map((l) => [l, LOCALE_LABELS[l]]))}
                    >
                      <SelectTrigger id="defaultLocale" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {routing.locales.map((l) => (
                          <SelectItem key={l} value={l}>
                            {LOCALE_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("currencyLabel")}</Label>
              <p className="text-sm text-text-secondary">{salon.currency}</p>
              <p className="text-xs text-text-muted">{t("currencyHint")}</p>
            </div>

            {serverError && (
              <p role="alert" className="text-xs text-danger">
                {errorMessage(serverError)}
              </p>
            )}

            {isOwner && (
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? tCommon("loading") : tCommon("save")}
                </Button>
                {saved && <span className="text-xs text-success">{tCommon("saved")}</span>}
              </div>
            )}
          </form>
        </fieldset>
      </CardContent>
    </Card>
  );
}
