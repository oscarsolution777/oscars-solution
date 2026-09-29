"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Control de paginación reutilizable (Pagos, Cuadre de caja, Finanzas y
// Reportes, CLAUDE.md) -- se usa junto al hook usePagination
// (src/lib/utils/pagination.ts), que recorta el array ya cargado en el
// cliente. No se muestra si todo cabe en una sola página.
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("common.pagination");

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 pt-1">
      <p className="text-xs text-text-muted">
        {t("pageLabel", { page, totalPages })}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} />
          {t("previous")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
