"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Movida desde el Dashboard (Fase 2) a Configuración (Fase 10) -- CLAUDE.md
// sección 9 ya listaba "QR" dentro del módulo Configuración, y hasta ahora
// esa página no existía.
export function QrCard({ qrDataUrl, portalUrl }: { qrDataUrl: string; portalUrl: string }) {
  const t = useTranslations("settings.qrPortal");
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
