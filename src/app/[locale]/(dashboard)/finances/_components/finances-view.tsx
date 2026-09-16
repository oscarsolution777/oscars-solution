"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/types/database";
import { SummaryCards } from "./summary-cards";
import { ExpensesTab } from "./expenses-tab";
import { ExpenseFormPanel } from "./expense-form-panel";
import { PayoutsTab } from "./payouts-tab";
import { PayoutFormPanel } from "./payout-form-panel";

type ExpenseRow = Tables<"expenses">;
type StaffPayoutRow = Tables<"staff_payouts">;
type StaffRow = Tables<"staff">;
type SupplierRow = Tables<"suppliers">;

export function FinancesView({
  expenses,
  payouts,
  staff,
  suppliers,
  summary,
  currency,
  timezone,
  locale,
}: {
  expenses: ExpenseRow[];
  payouts: StaffPayoutRow[];
  staff: StaffRow[];
  suppliers: SupplierRow[];
  summary: {
    incomeCents: number;
    expensesCents: number;
    payoutsCents: number;
    balanceCents: number;
  };
  currency: string;
  timezone: string;
  locale: string;
}) {
  const t = useTranslations("finances");

  const [tab, setTab] = useState<"expenses" | "payouts">("expenses");
  const [expenseFormState, setExpenseFormState] = useState<
    { mode: "create" } | { mode: "edit"; expenseId: string } | null
  >(null);
  const [payoutFormState, setPayoutFormState] = useState<
    { mode: "create" } | { mode: "edit"; payoutId: string } | null
  >(null);

  const suppliersById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers]
  );
  const staffById = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const editingExpense =
    expenseFormState?.mode === "edit"
      ? (expenses.find((expense) => expense.id === expenseFormState.expenseId) ?? null)
      : null;

  const editingPayout =
    payoutFormState?.mode === "edit"
      ? (payouts.find((payout) => payout.id === payoutFormState.payoutId) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <SummaryCards
        incomeCents={summary.incomeCents}
        expensesCents={summary.expensesCents}
        payoutsCents={summary.payoutsCents}
        balanceCents={summary.balanceCents}
        currency={currency}
        locale={locale}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="expenses">{t("tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="payouts">{t("tabs.payouts")}</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpensesTab
            expenses={expenses}
            suppliersById={suppliersById}
            currency={currency}
            timezone={timezone}
            locale={locale}
            onEdit={(expense) => setExpenseFormState({ mode: "edit", expenseId: expense.id })}
            onCreate={() => setExpenseFormState({ mode: "create" })}
          />
        </TabsContent>

        <TabsContent value="payouts">
          <PayoutsTab
            payouts={payouts}
            staffById={staffById}
            currency={currency}
            timezone={timezone}
            locale={locale}
            onEdit={(payout) => setPayoutFormState({ mode: "edit", payoutId: payout.id })}
            onCreate={() => setPayoutFormState({ mode: "create" })}
          />
        </TabsContent>
      </Tabs>

      <ExpenseFormPanel
        open={expenseFormState !== null}
        onOpenChange={(open) => !open && setExpenseFormState(null)}
        expense={editingExpense}
        suppliers={suppliers}
        currency={currency}
      />

      <PayoutFormPanel
        open={payoutFormState !== null}
        onOpenChange={(open) => !open && setPayoutFormState(null)}
        payout={editingPayout}
        staff={staff}
        currency={currency}
      />
    </div>
  );
}
