"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Selector manual de idioma para el cliente del portal (CLAUDE.md sección 5:
// "selector manual visible para el cliente"). Cambia de idioma manteniendo la
// misma ruta (catálogo, solicitud o estado).
const LOCALE_LABELS: Record<string, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
  it: "Italiano",
  fr: "Français",
  de: "Deutsch",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Select
      value={locale}
      onValueChange={(next) => {
        if (next) router.replace(pathname, { locale: next });
      }}
      items={Object.fromEntries(routing.locales.map((l) => [l, LOCALE_LABELS[l]]))}
    >
      <SelectTrigger size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
