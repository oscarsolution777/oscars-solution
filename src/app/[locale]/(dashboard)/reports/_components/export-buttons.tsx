"use client";

import { createContext, useContext, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { rowsToCsv } from "@/lib/utils/csv";
import { exportRowsToPdf } from "@/lib/utils/pdf-export";
import { formatCalendarDate, formatSalonDate } from "@/lib/utils/dates";
import type { Period } from "@/lib/utils/period";

// Datos comunes a todas las pestañas de Reportes (salón, zona horaria y
// periodo activo), provistos una sola vez por ReportsView para que cada
// pestaña no tenga que recibirlos solo para poder exportar.
export const ReportExportContext = createContext<{
  salonName: string;
  timezone: string;
  period: Period;
} | null>(null);

type TabKey = "sales" | "clients" | "services" | "staff" | "inventory";

// Descarga 100% en el navegador: los datos ya están resueltos por el Server
// Component y pasados como props, así que no hace falta ida y vuelta al
// servidor ni una Server Action nueva. Las claves de cada fila son los
// encabezados ya traducidos, en el orden en que deben salir las columnas.
export function ExportButtons({
  rows,
  baseFilename,
  tabKey,
  withPeriod = true,
}: {
  rows: Record<string, string | number>[];
  baseFilename: string;
  tabKey: TabKey;
  withPeriod?: boolean;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const context = useContext(ReportExportContext);
  const [pdfPending, setPdfPending] = useState(false);

  const suffix = withPeriod && context ? `_${context.period.from}_${context.period.to}` : "";

  const handleCsv = () => {
    // El BOM (﻿) hace que Excel abra el archivo como UTF-8 y no rompa acentos.
    const csv = "﻿" + rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseFilename}${suffix}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePdf = async () => {
    if (!context) return;
    setPdfPending(true);
    try {
      const metaLines: string[] = [];
      if (withPeriod) {
        metaLines.push(
          `${t("pdf.period")}: ${formatCalendarDate(context.period.from, locale, "PPP")} – ${formatCalendarDate(context.period.to, locale, "PPP")}`
        );
      }
      metaLines.push(
        `${t("pdf.generatedOn")}: ${formatSalonDate(new Date(), context.timezone, locale, "PPP")}`
      );

      await exportRowsToPdf({
        title: t(`tabs.${tabKey}`),
        salonName: context.salonName,
        metaLines,
        rows,
        filename: `${baseFilename}${suffix}.pdf`,
        pageLabel: (page, total) => t("pdf.page", { page, total }),
      });
    } finally {
      setPdfPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleCsv} disabled={rows.length === 0}>
        <Download size={14} />
        {t("exportCsv")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePdf}
        disabled={rows.length === 0 || pdfPending || !context}
      >
        <FileText size={14} />
        {t("exportPdf")}
      </Button>
    </div>
  );
}
