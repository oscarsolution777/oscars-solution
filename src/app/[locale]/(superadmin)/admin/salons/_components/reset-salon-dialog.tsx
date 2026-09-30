"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database";
import type { SalonResetCounts } from "@/lib/db/platform-salons";
import { getSalonResetPreviewAction, resetSalonDataAction } from "../actions";

type SalonRow = Tables<"salons">;

const COUNT_KEYS: (keyof SalonResetCounts)[] = [
  "requests",
  "appointments",
  "payments",
  "cash_closures",
  "stock_movements",
  "expenses",
  "staff_payouts",
  "clients",
];

// Borrado sin vuelta atrás (CLAUDE.md sección 12): un solo AlertDialog, como
// el que ya usa "Suspender", no es suficiente aquí. Este diálogo pide (1) ver
// el impacto real por tabla antes de decidir y (2) escribir el slug exacto
// del salón para habilitar el botón final — mismo patrón "type-to-confirm"
// de herramientas como Vercel/GitHub para operaciones irreversibles.
export function ResetSalonDialog({
  salon,
  open,
  onOpenChange,
}: {
  salon: SalonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("superadmin.salons.resetDialog");
  const tErrors = useTranslations("superadmin.salons.errors");
  const router = useRouter();

  // Los errores que devuelven las Server Actions son claves de traducción
  // completas (CLAUDE.md sección 5); este diálogo solo conoce dos posibles
  // fuera del genérico compartido, así que se resuelven por comparación
  // directa en vez de usar un traductor sin namespace (mismo patrón que
  // salon-form-panel.tsx).
  const resolveError = (key: string) => {
    if (key === "superadmin.salons.resetDialog.errors.slugMismatch") {
      return t("errors.slugMismatch");
    }
    return tErrors("generic");
  };

  const [preview, setPreview] = useState<SalonResetCounts | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SalonResetCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bug real detectado y corregido: el estado local (`result`, en particular)
  // sobrevivía de un reinicio a otro porque el diálogo nunca se desmontaba
  // entre uno y el siguiente -- al reabrirlo, saltaba directo a la pantalla
  // "listo" sin volver a pedir confirmación. La corrección real vive en
  // SalonsTable: le pasa un `key` que cambia en cada apertura, forzando un
  // remount completo (todo el useState vuelve a su valor inicial) en vez de
  // resetear el estado a mano acá dentro del efecto (evita el antipatrón
  // "setState síncrono dentro de un efecto", regla react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open || !salon) return;
    let cancelled = false;
    getSalonResetPreviewAction(salon.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setPreview(res.data);
      else setPreviewError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [open, salon]);

  if (!salon) return null;

  const canConfirm = confirmText.trim() === salon.slug && !pending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setPending(true);
    setError(null);
    const res = await resetSalonDataAction(salon.id, confirmText.trim());
    setPending(false);
    if (res.ok) {
      setResult(res.data);
      router.refresh();
    } else {
      setError(res.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: salon.name })}</AlertDialogTitle>
          {!result && (
            <AlertDialogDescription>{t("warning")}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {result ? (
          <div className="space-y-2 text-sm">
            <p className="text-text-secondary">{t("doneMessage")}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-content-bg px-3 py-2">
              {COUNT_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <span className="text-text-secondary">{t(`counts.${key}`)}</span>
                  <span className="font-mono font-medium text-text-primary">
                    {result[key] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {previewError ? (
              <p className="text-destructive">{resolveError(previewError)}</p>
            ) : preview ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-content-bg px-3 py-2">
                {COUNT_KEYS.map((key) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span className="text-text-secondary">{t(`counts.${key}`)}</span>
                    <span className="font-mono font-medium text-text-primary">
                      {preview[key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">{t("loadingPreview")}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm-slug">
                {t("confirmInputLabel", { slug: salon.slug })}
              </Label>
              <Input
                id="reset-confirm-slug"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={salon.slug}
                disabled={pending}
                autoComplete="off"
              />
            </div>

            {error && <p className="text-destructive">{resolveError(error)}</p>}
          </div>
        )}

        <AlertDialogFooter>
          {result ? (
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              {t("close")}
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                {pending ? t("confirmButtonPending") : t("confirmButton")}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
