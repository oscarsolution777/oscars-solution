"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expenses";
import { createExpenseAction, updateExpenseAction } from "../actions";
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

type ExpenseRow = Tables<"expenses">;
type SupplierRow = Tables<"suppliers">;

const NO_SUPPLIER_VALUE = "none";

function todayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function ExpenseFormPanel({
  open,
  onOpenChange,
  expense,
  suppliers,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseRow | null;
  suppliers: SupplierRow[];
  currency: string;
}) {
  const t = useTranslations("finances.expenses.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(expense);

  const buildDefaults = (): ExpenseInput => ({
    category: expense?.category ?? "",
    description: expense?.description ?? "",
    amount: expense ? (expense.amount_cents / 100).toFixed(2) : "",
    spentAt: expense?.spent_at ?? todayIsoDate(),
    supplierId: expense?.supplier_id ?? "",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: ExpenseInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("category", data.category);
    formData.set("description", data.description ?? "");
    formData.set("amount", data.amount);
    formData.set("spentAt", data.spentAt);
    formData.set("supplierId", data.supplierId ?? "");
    if (expense) formData.set("expenseId", expense.id);

    startTransition(async () => {
      const result = expense
        ? await updateExpenseAction(formData)
        : await createExpenseAction(formData);

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
            <Label htmlFor="category">{t("categoryLabel")}</Label>
            <Input id="category" {...register("category")} />
            {errors.category && <p className="text-xs text-danger">{t("categoryError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t("descriptionLabel")}</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("amountLabel", { currency })}</Label>
              <Input id="amount" inputMode="decimal" {...register("amount")} />
              {errors.amount && <p className="text-xs text-danger">{t("amountError")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spentAt">{t("dateLabel")}</Label>
              <Input id="spentAt" type="date" {...register("spentAt")} />
              {errors.spentAt && <p className="text-xs text-danger">{t("dateError")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="supplierId">{t("supplierLabel")}</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select
                  value={field.value || NO_SUPPLIER_VALUE}
                  onValueChange={(value) =>
                    field.onChange(value === NO_SUPPLIER_VALUE ? "" : value)
                  }
                >
                  <SelectTrigger id="supplierId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLIER_VALUE}>{t("noSupplier")}</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
