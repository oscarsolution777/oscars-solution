"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import type { CashDifferencePoint } from "@/lib/reports/aggregations";
import { KpiCards } from "./kpi-cards";
import { CashDifferenceChart } from "./cash-difference-chart";
import { ClosuresTable } from "./closures-table";
import { ClosureFormPanel } from "./closure-form-panel";

type CashClosureRow = Tables<"cash_closures">;

export function CashClosuresView({
  closures,
  differenceTrend,
  kpis,
  currency,
  locale,
}: {
  closures: CashClosureRow[];
  differenceTrend: CashDifferencePoint[];
  kpis: {
    closuresThisMonth: number;
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
      <KpiCards
        closuresThisMonth={kpis.closuresThisMonth}
        accumulatedDifferenceCents={kpis.accumulatedDifferenceCents}
        currency={currency}
        locale={locale}
      />

      <CashDifferenceChart points={differenceTrend} currency={currency} locale={locale} />

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
