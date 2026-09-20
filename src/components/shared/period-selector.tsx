"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Period, PeriodPreset } from "@/lib/utils/period";

// El periodo vive en la URL (?preset=&from=&to=), no en estado global
// (CLAUDE.md sección 2: preferir Server Components + URL state). Compartido
// entre Reportes y Dashboard (Fase de rediseño de gráficos) — cada módulo
// tiene su propio namespace de traducción con las mismas claves.
export function PeriodSelector({
  period,
  namespace = "reports.period",
}: {
  period: Period;
  namespace?: string;
}) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const pathname = usePathname();

  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>(period.preset);
  const [customFrom, setCustomFrom] = useState(period.from);
  const [customTo, setCustomTo] = useState(period.to);

  const applyPreset = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      router.push(`${pathname}?preset=${preset}`);
    }
  };

  const applyCustomRange = () => {
    router.push(`${pathname}?preset=custom&from=${customFrom}&to=${customTo}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedPreset} onValueChange={(value) => applyPreset(value as PeriodPreset)}>
        <SelectTrigger className="w-44">
          {/* @base-ui/react's Select.Value no traduce sola: sin children-función
              muestra el value crudo ("thisMonth") en vez del texto del SelectItem. */}
          <SelectValue>{(value: PeriodPreset) => t(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="thisMonth">{t("thisMonth")}</SelectItem>
          <SelectItem value="lastMonth">{t("lastMonth")}</SelectItem>
          <SelectItem value="last3Months">{t("last3Months")}</SelectItem>
          <SelectItem value="custom">{t("custom")}</SelectItem>
        </SelectContent>
      </Select>

      {selectedPreset === "custom" && (
        <>
          <Input
            type="date"
            className="h-9 w-36"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <Input
            type="date"
            className="h-9 w-36"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
          <Button size="sm" onClick={applyCustomRange}>
            {t("apply")}
          </Button>
        </>
      )}
    </div>
  );
}
