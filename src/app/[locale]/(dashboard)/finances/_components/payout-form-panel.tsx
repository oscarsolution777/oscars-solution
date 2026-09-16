"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { staffPayoutSchema, type StaffPayoutInput } from "@/lib/validations/staff-payouts";
import { createStaffPayoutAction, updateStaffPayoutAction } from "../actions";
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

type StaffPayoutRow = Tables<"staff_payouts">;
type StaffRow = Tables<"staff">;

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function PayoutFormPanel({
  open,
  onOpenChange,
  payout,
  staff,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payout: StaffPayoutRow | null;
  staff: StaffRow[];
  currency: string;
}) {
  const t = useTranslations("finances.payouts.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(payout);

  const buildDefaults = (): StaffPayoutInput => ({
    staffId: payout?.staff_id ?? staff[0]?.id ?? "",
    periodStart: payout?.period_start ?? todayIsoDate(),
    periodEnd: payout?.period_end ?? todayIsoDate(),
    baseAmount: payout
      ? (payout.base_cents / 100).toFixed(2)
      : ((staff[0]?.base_salary_cents ?? 0) / 100).toFixed(2),
    bonusAmount: payout ? (payout.bonus_cents / 100).toFixed(2) : "0.00",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StaffPayoutInput>({
    resolver: zodResolver(staffPayoutSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const selectedStaffId = useWatch({ control, name: "staffId" });

  useEffect(() => {
    if (!open || isEditing) return;
    const selected = staff.find((member) => member.id === selectedStaffId);
    if (selected) {
      setValue("baseAmount", (selected.base_salary_cents / 100).toFixed(2));
    }
  }, [open, isEditing, selectedStaffId, staff, setValue]);

  const onSubmit = (data: StaffPayoutInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("staffId", data.staffId);
    formData.set("periodStart", data.periodStart);
    formData.set("periodEnd", data.periodEnd);
    formData.set("baseAmount", data.baseAmount);
    formData.set("bonusAmount", data.bonusAmount);
    if (payout) formData.set("payoutId", payout.id);

    startTransition(async () => {
      const result = payout
        ? await updateStaffPayoutAction(formData)
        : await createStaffPayoutAction(formData);

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
            <Label htmlFor="staffId">{t("staffLabel")}</Label>
            <Controller
              control={control}
              name="staffId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing}
                  items={Object.fromEntries(staff.map((member) => [member.id, member.full_name]))}
                >
                  <SelectTrigger id="staffId" className="w-full">
                    <SelectValue placeholder={t("staffPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.staffId && <p className="text-xs text-danger">{t("staffError")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="periodStart">{t("periodStartLabel")}</Label>
              <Input id="periodStart" type="date" {...register("periodStart")} />
              {errors.periodStart && (
                <p className="text-xs text-danger">{t("periodError")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodEnd">{t("periodEndLabel")}</Label>
              <Input id="periodEnd" type="date" {...register("periodEnd")} />
              {errors.periodEnd && <p className="text-xs text-danger">{t("periodError")}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="baseAmount">{t("baseLabel", { currency })}</Label>
              <Input id="baseAmount" inputMode="decimal" {...register("baseAmount")} />
              {errors.baseAmount && (
                <p className="text-xs text-danger">{t("baseError")}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bonusAmount">{t("bonusLabel", { currency })}</Label>
              <Input id="bonusAmount" inputMode="decimal" {...register("bonusAmount")} />
              {errors.bonusAmount && (
                <p className="text-xs text-danger">{t("bonusError")}</p>
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
