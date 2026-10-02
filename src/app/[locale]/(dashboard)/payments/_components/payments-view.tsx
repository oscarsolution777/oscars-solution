"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/shared/period-selector";
import type { Tables } from "@/types/database";
import type { Period } from "@/lib/utils/period";
import type { SalesBucket, PaymentMethodSlice } from "@/lib/reports/aggregations";
import { KpiCards } from "./kpi-cards";
import { IncomeTrendChart } from "./income-trend-chart";
import { PaymentMethodChart } from "./payment-method-chart";
import { PaymentsTable } from "./payments-table";
import { PaymentFormPanel } from "./payment-form-panel";

type PaymentRow = Tables<"payments">;
type ClientRow = Tables<"clients">;

export function PaymentsView({
  payments,
  clients,
  incomeTrend,
  methodBreakdown,
  period,
  periodLabel,
  kpis,
  currency,
  timezone,
  locale,
}: {
  payments: PaymentRow[];
  clients: ClientRow[];
  incomeTrend: SalesBucket[];
  methodBreakdown: PaymentMethodSlice[];
  period: Period;
  periodLabel: string;
  kpis: {
    incomeInPeriodCents: number;
    pendingCount: number;
    averagePaymentCents: number;
    refundedInPeriodCents: number;
  };
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("payments");

  const [formState, setFormState] = useState<
    { mode: "create" } | { mode: "edit"; paymentId: string } | null
  >(null);

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [
    clients,
  ]);

  const editingPayment =
    formState?.mode === "edit"
      ? (payments.find((payment) => payment.id === formState.paymentId) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PeriodSelector period={period} namespace="payments.period" />
      </div>

      <KpiCards
        incomeInPeriodCents={kpis.incomeInPeriodCents}
        pendingCount={kpis.pendingCount}
        averagePaymentCents={kpis.averagePaymentCents}
        refundedInPeriodCents={kpis.refundedInPeriodCents}
        periodLabel={periodLabel}
        currency={currency}
        locale={locale}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IncomeTrendChart buckets={incomeTrend} currency={currency} locale={locale} />
        <PaymentMethodChart slices={methodBreakdown} currency={currency} locale={locale} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      <PaymentsTable
        payments={payments}
        clientsById={clientsById}
        currency={currency}
        timezone={timezone}
        locale={locale}
        onEdit={(payment) => setFormState({ mode: "edit", paymentId: payment.id })}
        onCreate={() => setFormState({ mode: "create" })}
      />

      <PaymentFormPanel
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
        payment={editingPayment}
        clients={clients}
        currency={currency}
      />
    </div>
  );
}
