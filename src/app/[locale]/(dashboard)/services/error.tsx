"use client";

import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/shared/error-state";

export default function ServicesError({ reset }: { reset: () => void }) {
  const t = useTranslations("common");

  return (
    <ErrorState message={t("error")} retryLabel={t("retry")} onRetry={reset} />
  );
}
