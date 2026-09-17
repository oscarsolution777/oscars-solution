"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { cancelRequestAction, requestRescheduleAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// Mapea cada código de error de negocio devuelto por las funciones security
// definer (migración 0015) a su traducción — mismo patrón que request-form.tsx
// para portal.form.errors.rateLimited.
function useStatusErrorMessage() {
  const t = useTranslations("portal.status.errors");
  const tForm = useTranslations("portal.form.errors");

  return (error: string): string => {
    if (error === "portal.form.errors.rateLimited") return tForm("rateLimited");
    switch (error) {
      case "portal.status.errors.not_found":
        return t("notFound");
      case "portal.status.errors.already_inactive":
        return t("alreadyInactive");
      case "portal.status.errors.already_happened":
        return t("alreadyHappened");
      case "portal.status.errors.not_reschedulable":
        return t("notReschedulable");
      case "portal.status.errors.salon_unavailable":
        return t("salonUnavailable");
      case "portal.status.errors.service_unavailable":
        return t("serviceUnavailable");
      case "portal.status.errors.invalidInput":
        return t("invalidInput");
      default:
        return t("generic");
    }
  };
}

export function StatusActions({
  slug,
  code,
  canCancel,
  canReschedule,
}: {
  slug: string;
  code: string;
  canCancel: boolean;
  canReschedule: boolean;
}) {
  const t = useTranslations("portal.status");
  const router = useRouter();
  const errorMessage = useStatusErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");

  if (!canCancel && !canReschedule) return null;

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelRequestAction(code);
      setCancelOpen(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleReschedule = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestRescheduleAction(code, { preferredDate });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/s/${slug}/estado/${result.data.newPublicCode}?rescheduled=1`);
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t border-card-border pt-3">
      {error && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage(error)}
        </p>
      )}

      {canReschedule && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rescheduleDate">{t("reschedule.dateLabel")}</Label>
          <div className="flex gap-2">
            <Input
              id="rescheduleDate"
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !preferredDate}
              onClick={handleReschedule}
            >
              {t("reschedule.submit")}
            </Button>
          </div>
        </div>
      )}

      {canCancel && (
        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <Button type="button" variant="destructive" onClick={() => setCancelOpen(true)}>
            {t("cancel.button")}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("cancel.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("cancel.confirmDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel.cancelAction")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={isPending} onClick={handleCancel}>
                {t("cancel.confirmAction")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
