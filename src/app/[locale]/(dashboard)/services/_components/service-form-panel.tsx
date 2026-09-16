"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { serviceSchema, type ServiceInput } from "@/lib/validations/services";
import { createServiceAction, updateServiceAction } from "../actions";
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
import { ServiceImageUploader } from "./service-image-uploader";

type ServiceRow = Tables<"services">;
type CategoryRow = Tables<"service_categories">;

export function ServiceFormPanel({
  open,
  onOpenChange,
  service,
  categories,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRow | null;
  categories: CategoryRow[];
  currency: string;
}) {
  const t = useTranslations("services.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(service);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      categoryId: service?.category_id ?? categories[0]?.id ?? "",
      name: service?.name ?? "",
      description: service?.description ?? "",
      features: service?.features?.join("\n") ?? "",
      price: service ? (service.price_cents / 100).toFixed(2) : "",
      durationMin: service ? String(service.duration_min) : "30",
    },
  });

  // Reinicia el formulario cada vez que el panel pasa de cerrado a abierto
  // (patrón "Adjusting state when a prop changes" de React: setState durante
  // el render, no en un efecto, para evitar el flash de un render extra).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      setImageFile(null);
      reset({
        categoryId: service?.category_id ?? categories[0]?.id ?? "",
        name: service?.name ?? "",
        description: service?.description ?? "",
        features: service?.features?.join("\n") ?? "",
        price: service ? (service.price_cents / 100).toFixed(2) : "",
        durationMin: service ? String(service.duration_min) : "30",
      });
    }
  }

  const onSubmit = (data: ServiceInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("categoryId", data.categoryId);
    formData.set("name", data.name);
    formData.set("description", data.description ?? "");
    formData.set("features", data.features ?? "");
    formData.set("price", data.price);
    formData.set("durationMin", data.durationMin);
    if (imageFile) formData.set("image", imageFile);
    if (service) formData.set("serviceId", service.id);

    startTransition(async () => {
      const result = service
        ? await updateServiceAction(formData)
        : await createServiceAction(formData);

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
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-danger">{t("nameError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="categoryId">{t("categoryLabel")}</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={Object.fromEntries(
                    categories.map((category) => [
                      category.id,
                      `${category.name}${!category.is_active ? ` (${tCommon("inactive")})` : ""}`,
                    ])
                  )}
                >
                  <SelectTrigger id="categoryId" className="w-full">
                    <SelectValue placeholder={t("categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                        {!category.is_active ? ` (${tCommon("inactive")})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-danger">{t("categoryError")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="price">{t("priceLabel", { currency })}</Label>
              <Input id="price" inputMode="decimal" {...register("price")} />
              {errors.price && (
                <p className="text-xs text-danger">{t("priceError")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="durationMin">{t("durationLabel")}</Label>
              <Input
                id="durationMin"
                type="number"
                min={1}
                {...register("durationMin")}
              />
              {errors.durationMin && (
                <p className="text-xs text-danger">{t("durationError")}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="features">{t("featuresLabel")}</Label>
            <Textarea
              id="features"
              rows={4}
              placeholder={t("featuresPlaceholder")}
              {...register("features")}
            />
          </div>

          <ServiceImageUploader
            fieldName="image"
            initialImageUrl={service?.image_url}
            onFileChange={setImageFile}
          />

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
