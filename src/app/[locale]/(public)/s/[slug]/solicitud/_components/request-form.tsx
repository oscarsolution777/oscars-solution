"use client";

import { useState, useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/utils/money";
import {
  publicRequestSchema,
  type PublicRequestInput,
} from "@/lib/validations/public-request";
import { submitPublicRequestAction } from "../actions";
import type { Tables } from "@/types/database";
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

type ServiceRow = Tables<"services">;

const NO_STAFF = "__none__";

export function RequestForm({
  slug,
  locale,
  currency,
  services,
  staff,
}: {
  slug: string;
  locale: string;
  currency: string;
  services: ServiceRow[];
  staff: { id: string; full_name: string }[];
}) {
  const t = useTranslations("portal.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PublicRequestInput>({
    resolver: zodResolver(publicRequestSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      preferredDate: "",
      items: services.map((s) => ({ serviceId: s.id, staffId: "" })),
    },
  });

  const { fields, remove } = useFieldArray({ control, name: "items" });
  const servicesById = new Map(services.map((s) => [s.id, s]));

  const totalCents = fields.reduce((sum, field) => {
    const service = servicesById.get(field.serviceId);
    return sum + (service?.price_cents ?? 0);
  }, 0);

  const onSubmit = (data: PublicRequestInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitPublicRequestAction(slug, data);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push(`/s/${slug}/estado/${result.data.publicCode}?new=1`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4" noValidate>
      <div>
        <h1 className="font-heading text-lg font-semibold text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">{t("reviewTitle")}</h2>
        {fields.map((field, index) => {
          const service = servicesById.get(field.serviceId);
          return (
            <div
              key={field.id}
              className="flex flex-col gap-2 rounded-lg border border-card-border p-3"
            >
              <input type="hidden" {...register(`items.${index}.serviceId`)} />
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">{service?.name}</p>
                  <p className="text-xs text-text-secondary">
                    {service ? formatMoney(service.price_cents, currency, locale) : ""}
                  </p>
                </div>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    aria-label={t("removeItem")}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
              <Controller
                control={control}
                name={`items.${index}.staffId`}
                render={({ field: staffField }) => (
                  <Select
                    value={staffField.value || NO_STAFF}
                    onValueChange={(value) =>
                      staffField.onChange(value === NO_STAFF ? "" : value)
                    }
                    items={{
                      [NO_STAFF]: t("staffUnassigned"),
                      ...Object.fromEntries(staff.map((member) => [member.id, member.full_name])),
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("staffPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_STAFF}>{t("staffUnassigned")}</SelectItem>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          );
        })}
        {errors.items && <p className="text-xs text-danger">{t("itemsError")}</p>}
        <div className="flex items-center justify-between border-t border-card-border pt-2 text-sm font-semibold text-text-primary">
          <span>{t("totalLabel")}</span>
          <span>{formatMoney(totalCents, currency, locale)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="clientName">{t("nameLabel")}</Label>
          <Input id="clientName" {...register("clientName")} />
          {errors.clientName && <p className="text-xs text-danger">{t("nameError")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientPhone">{t("phoneLabel")}</Label>
          <Input id="clientPhone" {...register("clientPhone")} />
          {errors.clientPhone && <p className="text-xs text-danger">{t("phoneError")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientEmail">{t("emailLabel")}</Label>
          <Input id="clientEmail" type="email" {...register("clientEmail")} />
          {errors.clientEmail && <p className="text-xs text-danger">{t("emailError")}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredDate">{t("preferredDateLabel")}</Label>
          <Input id="preferredDate" type="date" {...register("preferredDate")} />
        </div>
      </div>

      {serverError && (
        <p role="alert" className="text-xs text-danger">
          {serverError === "portal.form.errors.rateLimited"
            ? t("errors.rateLimited")
            : t("errors.generic")}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
