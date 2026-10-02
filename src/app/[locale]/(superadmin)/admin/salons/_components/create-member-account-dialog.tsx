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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/types/database";
import { createMemberAccountAction } from "../actions";

type SalonRow = Tables<"salons">;
type MemberRole = "admin" | "reception";

// Punto 17 del bloque de ajustes: crea la cuenta + membership de un
// admin/recepcionista para un salón que ya existe, con un clic -- antes era
// 100% manual (Supabase/SQL editor). Mismo patrón "key cambia en cada
// apertura" que EditSlugDialog/ResetSalonDialog: SalonsTable le pasa un
// `key` nuevo cada vez que se abre, así que el estado local siempre arranca
// limpio sin necesidad de un efecto que lo resetee a mano.
export function CreateMemberAccountDialog({
  salon,
  open,
  onOpenChange,
  onCreated,
}: {
  salon: SalonRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (credentials: { email: string; temporaryPassword: string }) => void;
}) {
  const t = useTranslations("superadmin.salons.createMemberDialog");
  const tErrors = useTranslations("superadmin.salons.errors");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<MemberRole>("admin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!salon) return null;

  const isValid = email.trim().length > 0 && fullName.trim().length > 0;

  const resolveError = (key: string) => {
    if (key === "superadmin.salons.createMemberDialog.errors.emailTaken") {
      return t("errors.emailTaken");
    }
    return tErrors("generic");
  };

  const handleConfirm = async () => {
    if (!isValid) return;
    setPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("email", email.trim());
    formData.set("fullName", fullName.trim());
    formData.set("role", role);

    const res = await createMemberAccountAction(salon.id, formData);
    setPending(false);
    if (res.ok) {
      router.refresh();
      onOpenChange(false);
      onCreated(res.data);
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

        <div className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="member-email">{t("emailLabel")}</Label>
            <Input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-name">{t("nameLabel")}</Label>
            <Input
              id="member-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={pending}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="member-role">{t("roleLabel")}</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as MemberRole)}
              items={{ admin: t("roleAdmin"), reception: t("roleReception") }}
            >
              <SelectTrigger id="member-role" className="w-full" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                <SelectItem value="reception">{t("roleReception")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-destructive">{resolveError(error)}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={pending || !isValid} onClick={handleConfirm}>
            {pending ? t("confirmPending") : t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
