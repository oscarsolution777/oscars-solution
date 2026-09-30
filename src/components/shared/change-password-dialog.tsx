"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { createClient } from "@/lib/supabase/browser";

// Autoservicio de contraseña (bloque de ajustes posterior a Fase 10, punto 1
// del listado): antes no existía ningún mecanismo para que una dueña/admin
// cambiara su propia contraseña -- la única contraseña se generaba una vez
// al crear la cuenta (credentialsDialog). Esto es independiente por completo
// del acceso de soporte del desarrollador (migración 0022): Oscar entra con
// su propia cuenta de platform_admin, nunca con la de la dueña, así que este
// cambio no afecta ese acceso en absoluto.
//
// Se pide la contraseña actual antes de cambiarla (defensa contra una sesión
// abierta sin vigilancia) verificándola con un signInWithPassword real, ya
// que Supabase Auth no expone una forma de validar la contraseña actual sin
// volver a autenticar. Todo ocurre client-side con el cliente browser (mismo
// patrón que el signOut de UserMenu) -- no hace falta Server Action porque
// auth.updateUser() ya opera sobre la sesión del propio usuario autenticado.
export function ChangePasswordDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("common.changePassword");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setDone(false);
    setPending(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setError(null);

    if (newPassword.length < 8) {
      setError(t("errors.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("errors.mismatch"));
      return;
    }

    setPending(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setPending(false);
      setError(t("errors.wrongCurrent"));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPending(false);
    if (updateError) {
      setError(t("errors.generic"));
      return;
    }
    setDone(true);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          {!done && <AlertDialogDescription>{t("subtitle")}</AlertDialogDescription>}
        </AlertDialogHeader>

        {done ? (
          <p className="text-sm text-text-secondary">{t("success")}</p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("currentLabel")}</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("newLabel")}</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">{t("confirmLabel")}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pending}
              />
            </div>
            {error && <p className="text-destructive">{error}</p>}
          </div>
        )}

        <AlertDialogFooter>
          {done ? (
            <AlertDialogAction onClick={() => handleOpenChange(false)}>
              {t("close")}
            </AlertDialogAction>
          ) : (
            <>
              <AlertDialogCancel disabled={pending}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={pending || !currentPassword || !newPassword || !confirmPassword}
                onClick={handleSubmit}
              >
                {pending ? t("submitPending") : t("submit")}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
