"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Tarjeta del Dashboard con el QR del portal público (Fase 2, CLAUDE.md
// sección 11 — "generación del QR"). Configuración (Fase 10) aún no existe,
// así que esta es la única pantalla real donde ubicarla.
export function QrPortalCard({ qrDataUrl, portalUrl }: { qrDataUrl: string; portalUrl: string }) {
  const t = useTranslations("dashboard.qrPortal");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorable: algunos navegadores bloquean el portapapeles sin HTTPS o
      // sin foco en el documento. El enlace sigue visible para copiar a mano.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={t("title")} className="size-32 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
          <p className="break-all text-sm text-text-secondary">{portalUrl}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? t("copied") : t("copyLink")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
