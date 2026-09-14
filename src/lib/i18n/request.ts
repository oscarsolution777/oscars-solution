import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

import es from "./locales/es.json";

type Messages = typeof es;

const loaders: Record<string, () => Promise<{ default: Messages }>> = {
  es: () => import("./locales/es.json"),
  en: () => import("./locales/en.json"),
  pt: () => import("./locales/pt.json"),
  it: () => import("./locales/it.json"),
  fr: () => import("./locales/fr.json"),
  de: () => import("./locales/de.json"),
};

// es.json es la fuente de verdad (CLAUDE.md sección 5). Si a otro idioma le
// falta una clave, se usa el valor en español en vez de romper la UI.
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = deepMerge(
        baseValue as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      );
    } else {
      result[key] = overrideValue;
    }
  }
  return result as T;
}

async function loadMessages(locale: string): Promise<Messages> {
  const loader = loaders[locale] ?? loaders[routing.defaultLocale];
  const target = (await loader()).default;
  if (locale === routing.defaultLocale) return target;
  return deepMerge(es, target);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
    ? (requested as string)
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
