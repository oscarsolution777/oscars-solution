"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { staffSchema, type StaffInput } from "@/lib/validations/staff";
import { createStaffAction, updateStaffAction } from "../actions";
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

type StaffRow = Tables<"staff">;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StaffFormPanel({
  open,
  onOpenChange,
  staffMember,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: StaffRow | null;
  currency: string;
}) {
  const t = useTranslations("staff.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(staffMember);

  const buildDefaults = (): StaffInput => ({
    fullName: staffMember?.full_name ?? "",
    roleTitle: staffMember?.role_title ?? "",
    phone: staffMember?.phone ?? "",
    baseSalary: staffMember ? (staffMember.base_salary_cents / 100).toFixed(2) : "",
    hiredAt: staffMember?.hired_at ?? todayIso(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: buildDefaults(),
  });

  // Reinicia el formulario cada vez que el panel pasa de cerrado a abierto.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: StaffInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("fullName", data.fullName);
    formData.set("roleTitle", data.roleTitle);
    formData.set("phone", data.phone ?? "");
    formData.set("baseSalary", data.baseSalary);
    formData.set("hiredAt", data.hiredAt);
    if (staffMember) formData.set("staffId", staffMember.id);

    startTransition(async () => {
      const result = staffMember
        ? await updateStaffAction(formData)
        : await createStaffAction(formData);

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
            <Label htmlFor="fullName">{t("nameLabel")}</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-xs text-danger">{t("nameError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="roleTitle">{t("roleLabel")}</Label>
            <Input id="roleTitle" {...register("roleTitle")} />
            {errors.roleTitle && (
              <p className="text-xs text-danger">{t("roleError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("phoneLabel")}</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="baseSalary">{t("baseSalaryLabel", { currency })}</Label>
              <Input id="baseSalary" inputMode="decimal" {...register("baseSalary")} />
              {errors.baseSalary && (
                <p className="text-xs text-danger">{t("baseSalaryError")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hiredAt">{t("hiredAtLabel")}</Label>
              <Input id="hiredAt" type="date" {...register("hiredAt")} />
              {errors.hiredAt && (
                <p className="text-xs text-danger">{t("hiredAtError")}</p>
              )}
            </div>
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
