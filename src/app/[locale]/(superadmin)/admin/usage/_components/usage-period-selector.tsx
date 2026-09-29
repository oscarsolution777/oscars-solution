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
import type { PlatformUsagePeriod, PlatformUsagePreset } from "@/lib/utils/platform-period";

// El periodo vive en la URL (?preset=&from=&to=), no en estado global
// (CLAUDE.md sección 2). Presets propios del Panel SuperAdmin (hoy/ayer/
// semana/mes/personalizado, más "todo" para el comportamiento de siempre) —
// distintos de components/shared/period-selector.tsx, que resuelve "hoy" en
// la zona horaria de un salón concreto y aquí no aplica (vista cross-tenant).
export function UsagePeriodSelector({ period }: { period: PlatformUsagePeriod }) {
  const t = useTranslations("superadmin.usage.period");
  const router = useRouter();
  const pathname = usePathname();

  const [selectedPreset, setSelectedPreset] = useState<PlatformUsagePreset>(period.preset);
  const [customFrom, setCustomFrom] = useState(period.from ?? "");
  const [customTo, setCustomTo] = useState(period.to ?? "");

  const applyPreset = (preset: PlatformUsagePreset) => {
    setSelectedPreset(preset);
    if (preset !== "custom") {
      router.push(`${pathname}?preset=${preset}`);
    }
  };

  const applyCustomRange = () => {
    if (!customFrom || !customTo) return;
    router.push(`${pathname}?preset=custom&from=${customFrom}&to=${customTo}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={selectedPreset} onValueChange={(value) => applyPreset(value as PlatformUsagePreset)}>
        <SelectTrigger className="w-44">
          {/* @base-ui/react's Select.Value no traduce sola: sin children-función
              muestra el value crudo ("thisMonth") en vez del texto del SelectItem. */}
          <SelectValue>{(value: PlatformUsagePreset) => t(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("all")}</SelectItem>
          <SelectItem value="today">{t("today")}</SelectItem>
          <SelectItem value="yesterday">{t("yesterday")}</SelectItem>
          <SelectItem value="week">{t("week")}</SelectItem>
          <SelectItem value="month">{t("month")}</SelectItem>
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
