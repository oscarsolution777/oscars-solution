"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { KpiCards } from "./kpi-cards";
import { RequestsTable } from "./requests-table";
import { RequestFormPanel } from "./request-form-panel";
import { ConfirmRequestPanel } from "./confirm-request-panel";
import { AppointmentsTable } from "./appointments-table";

type RequestRow = Tables<"requests">;
type RequestItemRow = Tables<"request_items">;
type AppointmentRow = Tables<"appointments">;
type AppointmentItemRow = Tables<"appointment_items">;
type ClientRow = Tables<"clients">;
type ServiceRow = Tables<"services">;
type StaffRow = Tables<"staff">;

export function RequestsView({
  requests,
  requestItems,
  appointments,
  appointmentItems,
  clients,
  services,
  staff,
  kpis,
  currency,
  locale,
}: {
  requests: RequestRow[];
  requestItems: RequestItemRow[];
  appointments: AppointmentRow[];
  appointmentItems: AppointmentItemRow[];
  clients: ClientRow[];
  services: ServiceRow[];
  staff: StaffRow[];
  kpis: {
    pendingRequestsCount: number;
    todayAppointmentsCount: number;
    noShowRate: number;
    completedRevenueCents: number;
  };
  currency: string;
  locale: string;
}) {
  const t = useTranslations("requests");

  const [tab, setTab] = useState<"inbox" | "agenda">("inbox");
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [confirmingRequestId, setConfirmingRequestId] = useState<string | null>(null);

  const itemsByRequestId = useMemo(() => {
    const map = new Map<string, RequestItemRow[]>();
    for (const item of requestItems) {
      const list = map.get(item.request_id) ?? [];
      list.push(item);
      map.set(item.request_id, list);
    }
    return map;
  }, [requestItems]);

  const itemsByAppointmentId = useMemo(() => {
    const map = new Map<string, AppointmentItemRow[]>();
    for (const item of appointmentItems) {
      const list = map.get(item.appointment_id) ?? [];
      list.push(item);
      map.set(item.appointment_id, list);
    }
    return map;
  }, [appointmentItems]);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [
    clients,
  ]);

  const confirmingRequest = confirmingRequestId
    ? (requests.find((request) => request.id === confirmingRequestId) ?? null)
    : null;
  const confirmingItems = confirmingRequestId
    ? (itemsByRequestId.get(confirmingRequestId) ?? [])
    : [];

  return (
    <div className="space-y-6">
      <KpiCards
        pendingRequestsCount={kpis.pendingRequestsCount}
        todayAppointmentsCount={kpis.todayAppointmentsCount}
        noShowRate={kpis.noShowRate}
        completedRevenueCents={kpis.completedRevenueCents}
        currency={currency}
        locale={locale}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="inbox">{t("tabs.inbox")}</TabsTrigger>
            <TabsTrigger value="agenda">{t("tabs.agenda")}</TabsTrigger>
          </TabsList>

          {tab === "inbox" && (
            <Button onClick={() => setRequestFormOpen(true)}>
              <Plus size={16} />
              {t("inbox.createButton")}
            </Button>
          )}
        </div>

        <TabsContent value="inbox">
          <RequestsTable
            requests={requests}
            itemsByRequestId={itemsByRequestId}
            locale={locale}
            onConfirm={(request) => setConfirmingRequestId(request.id)}
            onCreate={() => setRequestFormOpen(true)}
          />
        </TabsContent>

        <TabsContent value="agenda">
          <AppointmentsTable
            appointments={appointments}
            itemsByAppointmentId={itemsByAppointmentId}
            clientsById={clientsById}
            currency={currency}
            locale={locale}
          />
        </TabsContent>
      </Tabs>

      <RequestFormPanel
        open={requestFormOpen}
        onOpenChange={setRequestFormOpen}
        clients={clients}
        services={services}
        staff={staff}
      />

      <ConfirmRequestPanel
        open={confirmingRequestId !== null}
        onOpenChange={(open) => !open && setConfirmingRequestId(null)}
        request={confirmingRequest}
        items={confirmingItems}
        clients={clients}
        staff={staff}
      />
    </div>
  );
}
