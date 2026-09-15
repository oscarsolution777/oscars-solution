"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  serviceCategorySchema,
  type ServiceCategoryInput,
} from "@/lib/validations/service-categories";
import { createCategoryAction, updateCategoryAction } from "../actions";
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

type CategoryRow = Tables<"service_categories">;

export function CategoryFormPanel({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
}) {
  const t = useTranslations("services.categoryForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(category);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceCategoryInput>({
    resolver: zodResolver(serviceCategorySchema),
    defaultValues: { name: category?.name ?? "" },
  });

  // Reinicia el formulario cada vez que el panel pasa de cerrado a abierto
  // (patrón "Adjusting state when a prop changes" de React: setState durante
  // el render, no en un efecto, para evitar el flash de un render extra).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset({ name: category?.name ?? "" });
    }
  }

  const onSubmit = (data: ServiceCategoryInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    if (category) formData.set("categoryId", category.id);

    startTransition(async () => {
      const result = category
        ? await updateCategoryAction(formData)
        : await createCategoryAction(formData);

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
      <SheetContent>
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
            <Label htmlFor="category-name">{t("nameLabel")}</Label>
            <Input id="category-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-danger">{t("nameError")}</p>
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
