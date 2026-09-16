"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { KpiCards } from "./kpi-cards";
import { ClosuresTable } from "./closures-table";
import { ClosureFormPanel } from "./closure-form-panel";

type CashClosureRow = Tables<"cash_closures">;

export function CashClosuresView({
  closures,
  kpis,
  currency,
  timezone,
  locale,
}: {
  closures: CashClosureRow[];
  kpis: {
    closuresThisMonth: number;
    accumulatedDifferenceCents: number;
  };
  currency: string;
  timezone: string;
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

      <div className="flex justify-end">
        <Button onClick={() => setFormState({ mode: "create" })}>
          <Plus size={16} />
          {t("createButton")}
        </Button>
      </div>

      <ClosuresTable
        closures={closures}
        currency={currency}
        timezone={timezone}
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
