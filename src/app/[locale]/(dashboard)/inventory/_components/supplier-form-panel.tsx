"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { supplierSchema, type SupplierInput } from "@/lib/validations/suppliers";
import { createSupplierAction, updateSupplierAction } from "../actions";
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

type SupplierRow = Tables<"suppliers">;

export function SupplierFormPanel({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierRow | null;
}) {
  const t = useTranslations("inventory.suppliers.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(supplier);

  const buildDefaults = (): SupplierInput => ({
    name: supplier?.name ?? "",
    phone: supplier?.phone ?? "",
    email: supplier?.email ?? "",
    notes: supplier?.notes ?? "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: SupplierInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("phone", data.phone ?? "");
    formData.set("email", data.email ?? "");
    formData.set("notes", data.notes ?? "");
    if (supplier) formData.set("supplierId", supplier.id);

    startTransition(async () => {
      const result = supplier
        ? await updateSupplierAction(formData)
        : await createSupplierAction(formData);

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

          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phoneLabel")}</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{t("emailError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
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
