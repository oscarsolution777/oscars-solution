"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import type { Tables } from "@/types/database";
import { updateStaffServicesAction } from "../actions";

type StaffRow = Tables<"staff">;
type ServiceRow = Tables<"services">;

export function StaffServicesPanel({
  open,
  onOpenChange,
  staffMember,
  services,
  assignedServiceIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: StaffRow | null;
  services: ServiceRow[];
  assignedServiceIds: string[];
}) {
  const t = useTranslations("staff.servicesForm");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedServiceIds));
  const [prevOpen, setPrevOpen] = useState(open);

  // Reinicia la selección cada vez que el panel pasa de cerrado a abierto.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setServerError(null);
      setSelected(new Set(assignedServiceIds));
    }
  }

  if (!staffMember) return null;

  const toggleService = (serviceId: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(serviceId);
      else next.delete(serviceId);
      return next;
    });
  };

  const handleSave = () => {
    setServerError(null);
    startTransition(async () => {
      const result = await updateStaffServicesAction(staffMember.id, Array.from(selected));
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
          <SheetTitle>{t("title", { name: staffMember.full_name })}</SheetTitle>
          <SheetDescription>{t("subtitle")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-1 px-4">
          {services.length === 0 ? (
            <EmptyState title={t("noActiveServices")} />
          ) : (
            services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted"
              >
                <Label htmlFor={`service-${service.id}`} className="cursor-pointer font-normal">
                  {service.name}
                </Label>
                <Switch
                  id={`service-${service.id}`}
                  checked={selected.has(service.id)}
                  onCheckedChange={(checked) => toggleService(service.id, checked)}
                />
              </div>
            ))
          )}

          {serverError && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {t("genericError")}
            </p>
          )}
        </div>

        <SheetFooter>
          <Button className="w-full" onClick={handleSave} disabled={isPending}>
            {isPending ? tCommon("loading") : tCommon("save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
