"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  editAppointmentSchema,
  type EditAppointmentInput,
} from "@/lib/validations/appointments";
import { editAppointmentAction } from "../actions";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;

// Puntos 14/15 del bloque de ajustes: edita servicio/trabajador de una cita
// ya creada, solo mientras sigue "Programada" (CLAUDE.md sección 13,
// "Decisiones cerradas") -- fuera de ese estado se corrige por estado, no
// editando los items. No permite agregar/quitar servicios (appointment_items
// sigue sin DELETE) ni reasignar el cliente (fuera de alcance de este
// ajuste, a diferencia de la propuesta inicial -- si hace falta más
// adelante se construye aparte).
function EditItemRow({
  control,
  index,
  services,
  staff,
  serviceStaffMap,
  t,
}: {
  control: Control<EditAppointmentInput>;
  index: number;
  services: ServiceRow[];
  staff: StaffRow[];
  serviceStaffMap: Record<string, string[]>;
  t: ReturnType<typeof useTranslations>;
}) {
  const selectedServiceId = useWatch({ control, name: `items.${index}.serviceId` });
  const assignedIds = serviceStaffMap[selectedServiceId];
  const staffOptions =
    !assignedIds || assignedIds.length === 0
      ? staff
      : staff.filter((member) => assignedIds.includes(member.id));

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-card-border p-2">
      <Controller
        control={control}
        name={`items.${index}.serviceId`}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            items={Object.fromEntries(services.map((service) => [service.id, service.name]))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("servicePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <Controller
        control={control}
        name={`items.${index}.staffId`}
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={field.onChange}
            // items resuelve la etiqueta del valor actual aunque ya no esté
            // en staffOptions (filtrado) -- si no aparece ahí, Select muestra el id crudo.
            items={Object.fromEntries(staff.map((member) => [member.id, member.full_name]))}
          >
            <SelectTrigger className="w-full">
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
}

export function EditAppointmentPanel({
  open,
  onOpenChange,
  appointment,
  items,
  services,
  staff,
  serviceStaffMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentRow | null;
  items: AppointmentItemRow[];
  services: ServiceRow[];
  staff: StaffRow[];
  serviceStaffMap: Record<string, string[]>;
}) {
  const t = useTranslations("requests.appointmentForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevAppointmentId, setPrevAppointmentId] = useState<string | null>(null);

  const buildDefaults = (): EditAppointmentInput => ({
    items: items.map((item) => ({
      appointmentItemId: item.id,
      serviceId: item.service_id,
      staffId: item.staff_id,
    })),
  });

  const { control, handleSubmit, reset } = useForm<EditAppointmentInput>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: buildDefaults(),
  });

  const currentAppointmentId = appointment?.id ?? null;
  if (currentAppointmentId !== prevAppointmentId) {
    setPrevAppointmentId(currentAppointmentId);
    setServerError(null);
    reset(buildDefaults());
  }

  if (!appointment) return null;

  const onSubmit = (data: EditAppointmentInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await editAppointmentAction(appointment.id, data);
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
          <SheetTitle>{t("editTitle")}</SheetTitle>
          <SheetDescription>{t("editSubtitle")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-2">
            <Label>{t("itemsLabel")}</Label>
            {items.map((item, index) => (
              <EditItemRow
                key={item.id}
                control={control}
                index={index}
                services={services}
                staff={staff}
                serviceStaffMap={serviceStaffMap}
                t={t}
              />
            ))}
          </div>

          {serverError && (
            <p role="alert" className="text-xs text-danger">
              {serverError === "requests.errors.notEditable"
                ? t("editNotEditableError")
                : t("genericError")}
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
