import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("common");

  return (
    <div className="flex min-h-screen items-center justify-center bg-content-bg">
      <p className="text-sm text-text-secondary">{t("error")}</p>
    </div>
  );
}
