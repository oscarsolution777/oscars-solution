"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/utils/money";
import type { Tables } from "@/types/database";
import { CurrencyFormPanel } from "./currency-form-panel";
import { SubscriptionPriceFormPanel } from "./subscription-price-form-panel";
import { setCurrencyActiveAction } from "../actions";

type CurrencyRow = Tables<"currencies">;
type SubscriptionPriceRow = Tables<"subscription_prices">;

export function CurrenciesView({
  currencies,
  prices,
  locale,
}: {
  currencies: CurrencyRow[];
  prices: SubscriptionPriceRow[];
  locale: string;
}) {
  const t = useTranslations("superadmin.currencies");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currencyFormOpen, setCurrencyFormOpen] = useState(false);
  const [priceFormOpen, setPriceFormOpen] = useState(false);

  const toggleCurrency = (currency: CurrencyRow) => {
    startTransition(async () => {
      const result = await setCurrencyActiveAction(currency.code, !currency.is_active);
      if (result.ok) router.refresh();
    });
  };

  const activePrices = prices.filter((price) => price.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t("pageTitle")}</h1>
        <p className="text-sm text-text-secondary">{t("pageSubtitle")}</p>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">{t("currenciesTitle")}</h2>
          <Button size="sm" onClick={() => setCurrencyFormOpen(true)}>
            <Plus size={16} />
            {t("addCurrencyButton")}
          </Button>
        </div>

        {currencies.length === 0 ? (
          <EmptyState title={t("table.emptyTitle")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-card-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.columnCode")}</TableHead>
                  <TableHead>{t("table.columnName")}</TableHead>
                  <TableHead>{t("table.columnSymbol")}</TableHead>
                  <TableHead>{t("table.columnStatus")}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {currencies.map((currency) => (
                  <TableRow key={currency.code}>
                    <TableCell className="font-medium">{currency.code}</TableCell>
                    <TableCell>{currency.name}</TableCell>
                    <TableCell>{currency.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={currency.is_active ? "default" : "secondary"}>
                        {currency.is_active ? t("table.activateAction") : t("table.deactivateAction")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => toggleCurrency(currency)}
                      >
                        {currency.is_active ? t("table.deactivateAction") : t("table.activateAction")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">{t("pricesTitle")}</h2>
          <Button size="sm" onClick={() => setPriceFormOpen(true)}>
            <Plus size={16} />
            {t("pricesTable.setPriceAction")}
          </Button>
        </div>

        {activePrices.length === 0 ? (
          <EmptyState title={t("pricesTable.emptyTitle")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-card-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pricesTable.columnCurrency")}</TableHead>
                  <TableHead>{t("pricesTable.columnPrice")}</TableHead>
                  <TableHead>{t("pricesTable.columnUpdatedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePrices.map((price) => (
                  <TableRow key={price.id}>
                    <TableCell className="font-medium">{price.currency_code}</TableCell>
                    <TableCell>
                      {formatMoney(price.price_cents, price.currency_code, locale)}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {new Date(price.updated_at).toLocaleDateString(locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <CurrencyFormPanel open={currencyFormOpen} onOpenChange={setCurrencyFormOpen} />
      <SubscriptionPriceFormPanel
        open={priceFormOpen}
        onOpenChange={setPriceFormOpen}
        currencies={currencies.filter((currency) => currency.is_active)}
      />
    </div>
  );
}
