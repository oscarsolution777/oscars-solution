"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { requestSchema, type RequestInput } from "@/lib/validations/requests";
import { createRequestAction } from "../actions";
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

type ClientRow = Tables<"clients">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;

const NO_CLIENT = "__none__";
const NO_STAFF = "__none__";

// Punto 7 del bloque de ajustes: antes se mostraban TODOS los trabajadores
// activos sin importar el servicio elegido en esa fila. Ahora se filtra a
// los que `service_staff` tiene asignados a ese servicio -- si el servicio
// todavía no tiene ningún trabajador asignado, se cae de vuelta a la lista
// completa (para no bloquear el flujo mientras se configura la asignación).
// Componente propio (no solo una función) porque necesita su propio
// useWatch del serviceId de esta fila -- llamarlo condicionalmente dentro
// de fields.map() rompería las reglas de hooks al cambiar fields.length.
function RequestItemRow({
  control,
  index,
  services,
  staff,
  serviceStaffMap,
  showRemove,
  onRemove,
  t,
}: {
  control: Control<RequestInput>;
  index: number;
  services: ServiceRow[];
  staff: StaffRow[];
  serviceStaffMap: Record<string, string[]>;
  showRemove: boolean;
  onRemove: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const selectedServiceId = useWatch({ control, name: `items.${index}.serviceId` });
  const assignedIds = serviceStaffMap[selectedServiceId];
  const staffOptions =
    !assignedIds || assignedIds.length === 0
      ? staff
      : staff.filter((member) => assignedIds.includes(member.id));

  return (
    <div className="flex items-start gap-2 rounded-lg border border-card-border p-2">
      <div className="grid flex-1 grid-cols-2 gap-2">
        <Controller
          control={control}
          name={`items.${index}.serviceId`}
          render={({ field: serviceField }) => (
            <Select
              value={serviceField.value}
              onValueChange={serviceField.onChange}
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
          render={({ field: staffField }) => (
            <Select
              value={staffField.value || NO_STAFF}
              onValueChange={(value) => staffField.onChange(value === NO_STAFF ? "" : value)}
              items={{
                [NO_STAFF]: t("staffUnassigned"),
                ...Object.fromEntries(staffOptions.map((member) => [member.id, member.full_name])),
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("staffPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STAFF}>{t("staffUnassigned")}</SelectItem>
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
      {showRemove && (
        <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("removeItem")}>
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );
}

export function RequestFormPanel({
  open,
  onOpenChange,
  clients,
  services,
  staff,
  serviceStaffMap,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientRow[];
  services: ServiceRow[];
  staff: StaffRow[];
  serviceStaffMap: Record<string, string[]>;
}) {
  const t = useTranslations("requests.form");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  const buildDefaults = (): RequestInput => ({
    clientId: "",
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    preferredDate: "",
    items: [{ serviceId: services[0]?.id ?? "", staffId: "" }],
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<RequestInput>({
    resolver: zodResolver(requestSchema),
    defaultValues: buildDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const selectedClientId = useWatch({ control, name: "clientId" });

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      reset(buildDefaults());
    }
  }

  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) return;
    setValue("clientName", client.full_name);
    setValue("clientPhone", client.phone ?? "");
    setValue("clientEmail", client.email ?? "");
  }, [selectedClientId, clients, setValue]);

  const hasExistingClient = Boolean(selectedClientId);

  const onSubmit = (data: RequestInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createRequestAction(data);
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
          <SheetTitle>{t("createTitle")}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col gap-4 px-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="clientId">{t("existingClientLabel")}</Label>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value || NO_CLIENT}
                  onValueChange={(value) => field.onChange(value === NO_CLIENT ? "" : value)}
                  items={{
                    [NO_CLIENT]: t("existingClientNone"),
                    ...Object.fromEntries(clients.map((client) => [client.id, client.full_name])),
                  }}
                >
                  <SelectTrigger id="clientId" className="w-full">
                    <SelectValue placeholder={t("existingClientPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLIENT}>{t("existingClientNone")}</SelectItem>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientName">{t("clientNameLabel")}</Label>
              <Input id="clientName" disabled={hasExistingClient} {...register("clientName")} />
              {errors.clientName && <p className="text-xs text-danger">{t("clientNameError")}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone">{t("clientPhoneLabel")}</Label>
              <Input id="clientPhone" disabled={hasExistingClient} {...register("clientPhone")} />
              {errors.clientPhone && <p className="text-xs text-danger">{t("clientPhoneError")}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="clientEmail">{t("clientEmailLabel")}</Label>
            <Input
              id="clientEmail"
              type="email"
              disabled={hasExistingClient}
              {...register("clientEmail")}
            />
            {errors.clientEmail && <p className="text-xs text-danger">{t("clientEmailError")}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preferredDate">{t("preferredDateLabel")}</Label>
            <Input id="preferredDate" type="date" {...register("preferredDate")} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("itemsLabel")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ serviceId: services[0]?.id ?? "", staffId: "" })}
              >
                <Plus size={14} />
                {t("addItem")}
              </Button>
            </div>

            {fields.map((field, index) => (
              <RequestItemRow
                key={field.id}
                control={control}
                index={index}
                services={services}
                staff={staff}
                serviceStaffMap={serviceStaffMap}
                showRemove={fields.length > 1}
                onRemove={() => remove(index)}
                t={t}
              />
            ))}
            {errors.items && <p className="text-xs text-danger">{t("itemsError")}</p>}
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
