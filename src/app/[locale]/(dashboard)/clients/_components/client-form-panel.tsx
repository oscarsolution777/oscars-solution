"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { clientSchema, type ClientInput } from "@/lib/validations/clients";
import { createClientAction, updateClientAction } from "../actions";
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

type ClientRow = Tables<"clients">;

export function ClientFormPanel({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null;
}) {
  const t = useTranslations("clients.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const isEditing = Boolean(client);

  const buildDefaults = (): ClientInput => ({
    fullName: client?.full_name ?? "",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    notes: client?.notes ?? "",
    preferences: Array.isArray(client?.preferences)
      ? (client.preferences as string[]).join("\n")
      : "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: buildDefaults(),
  });

  // Reinicia el formulario cada vez que el panel pasa de cerrado a abierto
  // (patrón "Adjusting state when a prop changes" de React: setState durante
  // el render, no en un efecto).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  const onSubmit = (data: ClientInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("fullName", data.fullName);
    formData.set("phone", data.phone);
    formData.set("email", data.email ?? "");
    formData.set("notes", data.notes ?? "");
    formData.set("preferences", data.preferences ?? "");
    if (client) formData.set("clientId", client.id);

    startTransition(async () => {
      const result = client
        ? await updateClientAction(formData)
        : await createClientAction(formData);

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
            <Label htmlFor="phone">{t("phoneLabel")}</Label>
            <Input id="phone" type="tel" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-danger">{t("phoneError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-danger">{t("emailError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("notesLabel")}</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t("notesPlaceholder")}
              {...register("notes")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferences">{t("preferencesLabel")}</Label>
            <Textarea
              id="preferences"
              rows={4}
              placeholder={t("preferencesPlaceholder")}
              {...register("preferences")}
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
