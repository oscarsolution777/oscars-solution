"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { rowsToCsv } from "@/lib/utils/csv";

// Descarga 100% en el navegador: los datos ya están resueltos por el Server
// Component y pasados como props, así que no hace falta ida y vuelta al
// servidor ni una Server Action nueva.
export function ExportCsvButton({
  rows,
  filename,
}: {
  rows: Record<string, string | number>[];
  filename: string;
}) {
  const t = useTranslations("reports");

  const handleExport = () => {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
      <Download size={14} />
      {t("exportCsv")}
    </Button>
  );
}
