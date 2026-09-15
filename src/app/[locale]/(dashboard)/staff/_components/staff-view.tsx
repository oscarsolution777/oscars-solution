"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { KpiCards } from "./kpi-cards";
import { StaffTable } from "./staff-table";
import { StaffDetailPanel } from "./staff-detail-panel";
import { StaffFormPanel } from "./staff-form-panel";
import { StaffServicesPanel } from "./staff-services-panel";

type StaffRow = Tables<"staff">;
type ServiceRow = Tables<"services">;
type ServiceStaffRow = { service_id: string; staff_id: string };

export function StaffView({
  staff,
  services,
  serviceStaffRows,
  kpis,
  currency,
  timezone,
  locale,
  canWrite,
}: {
  staff: StaffRow[];
  services: ServiceRow[];
  serviceStaffRows: ServiceStaffRow[];
  kpis: {
    total: number;
    newThisMonth: number;
    servicesCovered: number;
    totalActiveServices: number;
    monthlyPayrollCents: number;
  };
  currency: string;
  timezone: string;
  locale: string;
  canWrite: boolean;
}) {
  const t = useTranslations("staff");

  const [viewingStaffId, setViewingStaffId] = useState<string | null>(null);
  const [formState, setFormState] = useState<
    { mode: "create" } | { mode: "edit"; staffId: string } | null
  >(null);
  const [servicesPanelStaffId, setServicesPanelStaffId] = useState<string | null>(null);

  const servicesById = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services]
  );

  const serviceIdsByStaff = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of serviceStaffRows) {
      const list = map.get(row.staff_id) ?? [];
      list.push(row.service_id);
      map.set(row.staff_id, list);
    }
    return map;
  }, [serviceStaffRows]);

  const viewingStaff = viewingStaffId
    ? (staff.find((member) => member.id === viewingStaffId) ?? null)
    : null;

  const editingStaff =
    formState?.mode === "edit"
      ? (staff.find((member) => member.id === formState.staffId) ?? null)
      : null;

  const servicesPanelStaff = servicesPanelStaffId
    ? (staff.find((member) => member.id === servicesPanelStaffId) ?? null)
    : null;

  const assignedServicesForViewing = (viewingStaff
    ? (serviceIdsByStaff.get(viewingStaff.id) ?? [])
    : []
  )
    .map((id) => servicesById.get(id))
    .filter((service): service is ServiceRow => Boolean(service));

  return (
    <div className="space-y-6">
      <KpiCards
        total={kpis.total}
        newThisMonth={kpis.newThisMonth}
        servicesCovered={kpis.servicesCovered}
        totalActiveServices={kpis.totalActiveServices}
        monthlyPayrollCents={kpis.monthlyPayrollCents}
        currency={currency}
        locale={locale}
      />

      {canWrite && (
        <div className="flex justify-end">
          <Button onClick={() => setFormState({ mode: "create" })}>
            <Plus size={16} />
            {t("createButton")}
          </Button>
        </div>
      )}

      <StaffTable
        staff={staff}
        currency={currency}
        locale={locale}
        canWrite={canWrite}
        onView={(member) => setViewingStaffId(member.id)}
        onEdit={(member) => setFormState({ mode: "edit", staffId: member.id })}
        onCreate={() => setFormState({ mode: "create" })}
      />

      <StaffDetailPanel
        open={viewingStaffId !== null}
        onOpenChange={(open) => !open && setViewingStaffId(null)}
        staffMember={viewingStaff}
        assignedServices={assignedServicesForViewing}
        currency={currency}
        timezone={timezone}
        locale={locale}
        canWrite={canWrite}
        onEdit={() => {
          if (!viewingStaff) return;
          setFormState({ mode: "edit", staffId: viewingStaff.id });
          setViewingStaffId(null);
        }}
        onEditServices={() => {
          if (!viewingStaff) return;
          setServicesPanelStaffId(viewingStaff.id);
          setViewingStaffId(null);
        }}
      />

      {canWrite && (
        <StaffFormPanel
          open={formState !== null}
          onOpenChange={(open) => !open && setFormState(null)}
          staffMember={editingStaff}
          currency={currency}
        />
      )}

      {canWrite && (
        <StaffServicesPanel
          open={servicesPanelStaffId !== null}
          onOpenChange={(open) => !open && setServicesPanelStaffId(null)}
          staffMember={servicesPanelStaff}
          services={services}
          assignedServiceIds={
            servicesPanelStaff ? (serviceIdsByStaff.get(servicesPanelStaff.id) ?? []) : []
          }
        />
      )}
    </div>
  );
}
