import { useTranslations } from "next-intl";

// Mapea cada código de error devuelto por actions.ts a su traducción --
// mismo patrón que useStatusErrorMessage() en el portal público (Fase 3,
// estado/[code]/_components/status-actions.tsx).
export function useSettingsErrorMessage() {
  const t = useTranslations("settings.errors");
  const tAuth = useTranslations("auth.login");

  return (error: string): string => {
    if (error === "auth.login.noMembership") return tAuth("noMembership");
    switch (error) {
      case "settings.errors.forbidden":
        return t("forbidden");
      case "settings.errors.invalidInput":
        return t("invalidInput");
      case "settings.errors.invalidLogo":
        return t("invalidLogo");
      case "settings.errors.notFound":
        return t("notFound");
      case "settings.errors.cannotEditSelf":
        return t("cannotEditSelf");
      case "settings.errors.invalidRole":
        return t("invalidRole");
      default:
        return t("generic");
    }
  };
}
