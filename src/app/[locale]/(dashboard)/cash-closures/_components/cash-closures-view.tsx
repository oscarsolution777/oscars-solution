"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/shared/period-selector";
import type { Tables } from "@/types/database";
import type { Period } from "@/lib/utils/period";
import type { CashClosureComparisonPoint } from "@/lib/reports/aggregations";
import { KpiCards } from "./kpi-cards";
import { CashComparisonChart } from "./cash-comparison-chart";
import { ClosuresTable } from "./closures-table";
import { ClosureFormPanel } from "./closure-form-panel";

type CashClosureRow = Tables<"cash_closures">;

export function CashClosuresView({
  closures,
  comparisonPoints,
  period,
  periodLabel,
  kpis,
  currency,
  locale,
}: {
  closures: CashClosureRow[];
  comparisonPoints: CashClosureComparisonPoint[];
  period: Period;
  periodLabel: string;
  kpis: {
    closuresInPeriod: number;
    accumulatedDifferenceCents: number;
  };
  currency: string;
  locale: string;
}) {
  const t = useTranslations("cashClosures");

  const [formState, setFormState] = useState<
    { mode: "create" } | { mode: "edit"; closureId: string } | null
  >(null);

  const editingClosure =
    formState?.mode === "edit"
      ? (closures.find((closure) => closure.id === formState.closureId) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PeriodSelector period={period} namespace="cashClosures.period" />
      </div>

      <KpiCards
        closuresInPeriod={kpis.closuresInPeriod}
        accumulatedDifferenceCents={kpis.accumulatedDifferenceCents}
        periodLabel={periodLabel}
        currency={currency}
        locale={locale}
      />

      <CashComparisonChart points={comparisonPoints} currency={currency} locale={locale} />

      <div className="flex justify-end">
        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      <ClosuresTable
        closures={closures}
        currency={currency}
        locale={locale}
        onEdit={(closure) => setFormState({ mode: "edit", closureId: closure.id })}
        onCreate={() => setFormState({ mode: "create" })}
      />

      <ClosureFormPanel
        open={formState !== null}
        onOpenChange={(open) => !open && setFormState(null)}
        closure={editingClosure}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
