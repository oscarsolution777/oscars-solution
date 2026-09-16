"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

// Muestra la contraseña temporal de la nueva cuenta una sola vez, tal como
// devuelve createSalonAction/createDemoSalonAction: no se persiste en texto
// plano en ninguna tabla (Fase 9A, decisión 3 del plan).
export function CredentialsDialog({
  open,
  onOpenChange,
  credentials,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentials: { email: string; temporaryPassword: string } | null;
}) {
  const t = useTranslations("superadmin.salons.credentialsDialog");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("body")}</AlertDialogDescription>
        </AlertDialogHeader>

        {credentials && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-content-bg px-3 py-2">
              <span className="text-text-secondary">{t("emailLabel")}</span>
              <span className="font-mono font-medium text-text-primary">
                {credentials.email}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-content-bg px-3 py-2">
              <span className="text-text-secondary">{t("passwordLabel")}</span>
              <span className="font-mono font-medium text-text-primary">
                {credentials.temporaryPassword}
              </span>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            {t("close")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
