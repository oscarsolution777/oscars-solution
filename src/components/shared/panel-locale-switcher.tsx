"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Languages, Check } from "lucide-react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing, type AppLocale } from "@/lib/i18n/routing";
import { LOCALE_LABELS } from "@/lib/i18n/locale-labels";
import { updateProfileLocaleAction } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Selector de idioma del panel de gestión y del SuperAdmin (CLAUDE.md sección
// 5: "preferencia del usuario, profiles.locale, con selector en el header").
// Cambia la URL actual al mismo path con otro locale (mismo patrón que el
// LocaleSwitcher del portal QR) y de paso persiste la preferencia en
// profiles.locale, para que la próxima sesión ya cargue en ese idioma sin
// depender de la cookie NEXT_LOCALE del navegador.
export function PanelLocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSelect = (next: AppLocale) => {
    if (next === locale || isPending) return;
    startTransition(() => {
      void updateProfileLocaleAction(next);
    });
    router.replace(pathname, { locale: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={t("languageSwitcher.label")}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-secondary outline-none hover:bg-black/5 disabled:opacity-60"
      >
        <Languages size={18} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <p className="px-2 py-1.5 text-xs font-medium text-text-muted">
          {t("languageSwitcher.label")}
        </p>
        {routing.locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleSelect(l)}
            className="flex items-center justify-between gap-2"
          >
            <span>{LOCALE_LABELS[l]}</span>
            {l === locale && <Check size={14} className="shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
