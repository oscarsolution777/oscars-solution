// Valida que todas las claves de es.json (fuente de verdad) existan en los
// otros 5 idiomas. Informativo: reporta claves faltantes pero no rompe el
// build (CLAUDE.md sección 5: fallback visible a es, nunca UI rota).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, "..", "src", "lib", "i18n", "locales");
const SOURCE_LOCALE = "es";
const LOCALES = ["es", "en", "pt", "it", "fr", "de"];

function loadLocale(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function collectKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return collectKeys(value, fullKey);
    }
    return [fullKey];
  });
}

const source = loadLocale(SOURCE_LOCALE);
const sourceKeys = new Set(collectKeys(source));

let hasMissing = false;

for (const locale of LOCALES) {
  if (locale === SOURCE_LOCALE) continue;
  const target = loadLocale(locale);
  const targetKeys = new Set(collectKeys(target));
  const missing = [...sourceKeys].filter((key) => !targetKeys.has(key));

  if (missing.length > 0) {
    hasMissing = true;
    console.warn(`\n[${locale}] Faltan ${missing.length} clave(s) (fallback a ${SOURCE_LOCALE}):`);
    for (const key of missing) console.warn(`  - ${key}`);
  } else {
    console.log(`[${locale}] OK — todas las claves presentes.`);
  }
}

if (hasMissing) {
  console.warn(
    "\ni18n:check terminó con claves pendientes de traducir. No bloquea el build."
  );
} else {
  console.log("\ni18n:check: los 6 idiomas están completos.");
}
