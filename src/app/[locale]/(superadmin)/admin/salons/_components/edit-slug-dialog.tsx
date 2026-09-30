"use client";

import { useState } from "react";
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
import { updateSalonSlugAction } from "../actions";

type SalonRow = Tables<"salons">;

const SLUG_PATTERN = /^[a-z0-9-]+$/;

// Punto 3.2 del bloque de ajustes posterior a Fase 10: reasignar el slug de
// un salón existente a otro cliente. Deliberadamente separado de "Reiniciar
// salón" (ver comentario en db/platform-salons.ts). SalonsTable le pasa un
// `key` que cambia en cada apertura, así que cada vez que se abre este
// componente es una instancia nueva: el estado local se inicializa siempre
// desde `salon.slug` sin necesidad de un efecto que lo resetee a mano
// (mismo patrón que ResetSalonDialog, ver el comentario ahí).
export function EditSlugDialog({
  salon,
  open,
  onOpenChange,
}: {
  salon: SalonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("superadmin.salons.editSlugDialog");
  const tErrors = useTranslations("superadmin.salons.errors");
  const router = useRouter();

  const [slug, setSlug] = useState(salon?.slug ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!salon) return null;

  const trimmed = slug.trim().toLowerCase();
  const isValid = SLUG_PATTERN.test(trimmed) && trimmed.length > 0;
  const unchanged = trimmed === salon.slug;

  const resolveError = (key: string) => {
    if (key === "superadmin.salons.errors.slugTaken") {
      return t("errors.slugTaken");
    }
    return tErrors("generic");
  };

  const handleConfirm = async () => {
    if (!isValid || unchanged) return;
    setPending(true);
    setError(null);
    const res = await updateSalonSlugAction(salon.id, trimmed);
    setPending(false);
    if (res.ok) {
      router.refresh();
      onOpenChange(false);
    } else {
      setError(res.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: salon.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 text-sm">
          <Label htmlFor="edit-slug">{t("slugLabel")}</Label>
          <Input
            id="edit-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={pending}
            autoComplete="off"
          />
          {!isValid && slug.length > 0 && (
            <p className="text-xs text-danger">{t("slugError")}</p>
          )}
          {error && <p className="text-destructive">{resolveError(error)}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || !isValid || unchanged}
            onClick={handleConfirm}
          >
            {pending ? t("confirmPending") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
