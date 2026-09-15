"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/types/database";
import { KpiCards } from "./kpi-cards";
import { ClientsTable } from "./clients-table";
import { ClientDetailPanel } from "./client-detail-panel";
import { ClientFormPanel } from "./client-form-panel";

type ClientRow = Tables<"clients">;

export function ClientsView({
  clients,
  kpis,
  currency,
  timezone,
  locale,
}: {
  clients: ClientRow[];
  kpis: {
    total: number;
    newThisMonth: number;
    withHistory: number;
    totalSpentCents: number;
  };
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("clients");
  const [search, setSearch] = useState("");

  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [formState, setFormState] = useState<
    { mode: "create" } | { mode: "edit"; clientId: string } | null
  >(null);

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter(
      (client) =>
        client.full_name.toLowerCase().includes(term) ||
        client.phone.toLowerCase().includes(term)
    );
  }, [clients, search]);

  const viewingClient = viewingClientId
    ? (clients.find((client) => client.id === viewingClientId) ?? null)
    : null;

  const editingClient =
    formState?.mode === "edit"
      ? (clients.find((client) => client.id === formState.clientId) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <KpiCards
        total={kpis.total}
        newThisMonth={kpis.newThisMonth}
        withHistory={kpis.withHistory}
        totalSpentCents={kpis.totalSpentCents}
        currency={currency}
        locale={locale}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text-muted"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("table.searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      <ClientsTable
        clients={filteredClients}
        timezone={timezone}
        locale={locale}
        onView={(client) => setViewingClientId(client.id)}
        onEdit={(client) => setFormState({ mode: "edit", clientId: client.id })}
        onCreate={() => setFormState({ mode: "create" })}
      />

      <ClientDetailPanel
        open={viewingClientId !== null}
        onOpenChange={(open) => !open && setViewingClientId(null)}
        client={viewingClient}
        currency={currency}
        timezone={timezone}
        locale={locale}
        onEdit={() => {
          if (!viewingClient) return;
          setFormState({ mode: "edit", clientId: viewingClient.id });
          setViewingClientId(null);
        }}
      />

      <ClientFormPanel
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
        client={editingClient}
      />
    </div>
  );
}
