"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  paymentSchema,
  paymentMethods,
  paymentStatuses,
  type PaymentInput,
} from "@/lib/validations/payments";
import { createPaymentAction, updatePaymentAction } from "../actions";
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

type PaymentRow = Tables<"payments">;
type ClientRow = Tables<"clients">;

export function PaymentFormPanel({
  open,
  onOpenChange,
  payment,
  clients,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentRow | null;
  clients: ClientRow[];
  currency: string;
}) {
  const t = useTranslations("payments.form");
  const tMethods = useTranslations("payments.methods");
  const tStatuses = useTranslations("payments.statuses");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(payment);

  const buildDefaults = (): PaymentInput => ({
    clientId: payment?.client_id ?? clients[0]?.id ?? "",
    amount: payment ? (payment.amount_cents / 100).toFixed(2) : "",
    method: (payment?.method as PaymentInput["method"]) ?? "cash",
    status: (payment?.status as PaymentInput["status"]) ?? "paid",
    reference: payment?.reference ?? "",
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaults(),
  });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: PaymentInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("clientId", data.clientId);
    formData.set("amount", data.amount);
    formData.set("method", data.method);
    formData.set("status", data.status);
    formData.set("reference", data.reference ?? "");
    if (payment) formData.set("paymentId", payment.id);

    startTransition(async () => {
      const result = payment
        ? await updatePaymentAction(formData)
        : await createPaymentAction(formData);

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
            <Label htmlFor="clientId">{t("clientLabel")}</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder={t("clientPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && <p className="text-xs text-danger">{t("clientError")}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount">{t("amountLabel", { currency })}</Label>
              <Input id="amount" inputMode="decimal" {...register("amount")} />
              {errors.amount && <p className="text-xs text-danger">{t("amountError")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="method">{t("methodLabel")}</Label>
              <Controller
                control={control}
                name="method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {tMethods(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">{t("statusLabel")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tStatuses(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">{t("referenceLabel")}</Label>
            <Input id="reference" {...register("reference")} />
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
