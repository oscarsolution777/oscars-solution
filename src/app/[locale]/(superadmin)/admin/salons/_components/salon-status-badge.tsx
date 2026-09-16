"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

export function SalonStatusBadge({
  status,
}: {
  status: "trial" | "active" | "suspended" | "cancelled";
}) {
  const t = useTranslations("superadmin.salons.status");

  const variant =
    status === "active"
      ? "default"
      : status === "trial"
        ? "secondary"
        : "destructive";

  return <Badge variant={variant}>{t(status)}</Badge>;
}
