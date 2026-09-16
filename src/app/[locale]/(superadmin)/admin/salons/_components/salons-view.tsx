"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database";
import { SalonsTable } from "./salons-table";
import { SalonFormPanel } from "./salon-form-panel";
import { CredentialsDialog } from "./credentials-dialog";

type SalonRow = Tables<"salons">;
type CurrencyRow = Tables<"currencies">;

export function SalonsView({
  salons,
  currencies,
  locale,
}: {
  salons: SalonRow[];
  currencies: CurrencyRow[];
  locale: string;
}) {
  const t = useTranslations("superadmin.salons");
  const [formMode, setFormMode] = useState<"real" | "demo" | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{t("pageTitle")}</h1>
          <p className="text-sm text-text-secondary">{t("pageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setFormMode("demo")}>
            <Plus size={16} />
            {t("createDemoButton")}
          </Button>
          <Button onClick={() => setFormMode("real")}>
            <Plus size={16} />
            {t("createRealButton")}
          </Button>
        </div>
      </div>

      <SalonsTable salons={salons} locale={locale} />

      <SalonFormPanel
        open={formMode !== null}
        onOpenChange={(open) => !open && setFormMode(null)}
        mode={formMode ?? "real"}
        currencies={currencies}
        onCreated={setCredentials}
      />

      <CredentialsDialog
        open={credentials !== null}
        onOpenChange={(open) => !open && setCredentials(null)}
        credentials={credentials}
      />
    </div>
  );
}
