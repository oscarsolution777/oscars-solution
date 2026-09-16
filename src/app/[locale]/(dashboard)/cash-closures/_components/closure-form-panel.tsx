"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { cashClosureSchema, type CashClosureInput } from "@/lib/validations/cash-closures";
import {
  createCashClosureAction,
  updateCashClosureAction,
  previewExpectedCashAction,
} from "../actions";
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
import { formatMoney } from "@/lib/utils/money";

type CashClosureRow = Tables<"cash_closures">;

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function ClosureFormPanel({
  open,
  onOpenChange,
  closure,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closure: CashClosureRow | null;
  currency: string;
  locale: string;
}) {
  const t = useTranslations("cashClosures.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  const [previewCents, setPreviewCents] = useState<number | null>(null);

  const isEditing = Boolean(closure);

  const buildDefaults = (): CashClosureInput => ({
    closureDate: closure?.closure_date ?? todayIsoDate(),
    openingCash: closure ? (closure.opening_cash_cents / 100).toFixed(2) : "0.00",
    countedCash: closure ? (closure.counted_cash_cents / 100).toFixed(2) : "",
    notes: closure?.notes ?? "",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CashClosureInput>({
    resolver: zodResolver(cashClosureSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      setPreviewCents(null);
      reset(buildDefaults());
    }
  }

  const closureDate = useWatch({ control, name: "closureDate" });

  useEffect(() => {
    if (!open || isEditing || !closureDate) return;
    let cancelled = false;
    previewExpectedCashAction(closureDate).then((result) => {
      if (!cancelled && result.ok) setPreviewCents(result.data.expectedCents);
    });
    return () => {
      cancelled = true;
    };
  }, [open, isEditing, closureDate]);

  const onSubmit = (data: CashClosureInput) => {
    setServerError(null);
    const formData = new FormData();

    if (closure) {
      formData.set("closureId", closure.id);
      formData.set("countedCash", data.countedCash);
      formData.set("notes", data.notes ?? "");
    } else {
      formData.set("closureDate", data.closureDate);
      formData.set("openingCash", data.openingCash);
      formData.set("countedCash", data.countedCash);
      formData.set("notes", data.notes ?? "");
    }

    startTransition(async () => {
      const result = closure
        ? await updateCashClosureAction(formData)
        : await createCashClosureAction(formData);

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
            <Label htmlFor="closureDate">{t("dateLabel")}</Label>
            <Input
              id="closureDate"
              type="date"
              disabled={isEditing}
              {...register("closureDate")}
            />
            {errors.closureDate && (
              <p className="text-xs text-danger">{t("dateError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="openingCash">{t("openingLabel", { currency })}</Label>
            <Input
              id="openingCash"
              inputMode="decimal"
              disabled={isEditing}
              {...register("openingCash")}
            />
            {errors.openingCash && (
              <p className="text-xs text-danger">{t("openingError")}</p>
            )}
          </div>

          {!isEditing && (
            <p className="text-xs text-text-secondary">
              {t("expectedPreview", {
                amount: previewCents !== null ? formatMoney(previewCents, currency, locale) : "—",
              })}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="countedCash">{t("countedLabel", { currency })}</Label>
            <Input id="countedCash" inputMode="decimal" {...register("countedCash")} />
            {errors.countedCash && (
              <p className="text-xs text-danger">{t("countedError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-danger">
              {t(serverError.endsWith("duplicateDate") ? "duplicateDateError" : "genericError")}
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
