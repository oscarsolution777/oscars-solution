"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { confirmRequestSchema, type ConfirmRequestInput } from "@/lib/validations/appointments";
import { confirmRequestAction } from "../actions";
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

type RequestRow = Tables<"requests">;
type RequestItemRow = Tables<"request_items">;
type ClientRow = Tables<"clients">;
type StaffRow = Tables<"staff">;

const NEW_CLIENT = "__new__";

export function ConfirmRequestPanel({
  open,
  onOpenChange,
  request,
  items,
  clients,
  staff,
  serviceStaffMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestRow | null;
  items: RequestItemRow[];
  clients: ClientRow[];
  staff: StaffRow[];
  serviceStaffMap: Record<string, string[]>;
}) {
  const t = useTranslations("requests.confirm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevRequestId, setPrevRequestId] = useState<string | null>(null);

  const buildDefaults = (): ConfirmRequestInput => ({
    appointmentDate: request?.preferred_date ?? "",
    clientId: request?.client_id ?? "",
    items: items.map((item) => ({
      requestItemId: item.id,
      serviceId: item.service_id,
      staffId: item.staff_id ?? "",
    })),
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfirmRequestInput>({
    resolver: zodResolver(confirmRequestSchema),
    defaultValues: buildDefaults(),
  });

  const currentRequestId = request?.id ?? null;
  if (currentRequestId !== prevRequestId) {
    setPrevRequestId(currentRequestId);
    setServerError(null);
    reset(buildDefaults());
  }

  if (!request) return null;

  const onSubmit = (data: ConfirmRequestInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await confirmRequestAction(request.id, {
        ...data,
        clientId: data.clientId === NEW_CLIENT ? "" : data.clientId,
      });
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
          <SheetTitle>{t("title", { name: request.client_name })}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="appointmentDate">{t("dateLabel")}</Label>
            <Input id="appointmentDate" type="date" {...register("appointmentDate")} />
            {errors.appointmentDate && <p className="text-xs text-danger">{t("dateError")}</p>}
          </div>

          {!request.client_id && (
            <div className="space-y-1.5">
              <Label htmlFor="clientId">{t("clientLabel")}</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select
                    value={field.value || NEW_CLIENT}
                    onValueChange={(value) => field.onChange(value === NEW_CLIENT ? "" : value)}
                    items={{
                      [NEW_CLIENT]: t("clientNewOption", { name: request.client_name }),
                      ...Object.fromEntries(clients.map((client) => [client.id, client.full_name])),
                    }}
                  >
                    <SelectTrigger id="clientId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NEW_CLIENT}>
                        {t("clientNewOption", { name: request.client_name })}
                      </SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("itemsLabel")}</Label>
            {items.map((item, index) => {
              // Punto 7 del bloque de ajustes: filtra a los trabajadores
              // asignados (service_staff) al servicio de esta solicitud, con
              // fallback a la lista completa si ese servicio aún no tiene
              // ninguno asignado. Aquí el servicio ya viene fijo
              // (item.service_id, de la solicitud original) -- no hace falta
              // useWatch como en los formularios donde el servicio se elige.
              const assignedIds = serviceStaffMap[item.service_id];
              const staffOptions =
                !assignedIds || assignedIds.length === 0
                  ? staff
                  : staff.filter((member) => assignedIds.includes(member.id));

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-card-border p-2"
                >
                  <span className="text-sm text-text-primary">{item.service_name_snapshot}</span>
                  <Controller
                    control={control}
                    name={`items.${index}.staffId`}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        // items resuelve la etiqueta del valor actual aunque ya no esté
                        // en staffOptions (filtrado) -- si no aparece ahí, Select muestra el id crudo.
                        items={Object.fromEntries(
                          staff.map((member) => [member.id, member.full_name])
                        )}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder={t("staffPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {staffOptions.map((member) => (
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
            {errors.items && <p className="text-xs text-danger">{t("staffError")}</p>}
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-danger">
              {t("genericError")}
            </p>
          )}

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? tCommon("loading") : t("confirmButton")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
