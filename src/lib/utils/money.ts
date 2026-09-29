// El dinero se guarda SIEMPRE en céntimos (price_cents: integer). El
// formateo a texto legible ocurre únicamente aquí, en la capa de
// presentación (CLAUDE.md sección 5, regla "Dinero").

// Códigos cuyo símbolo "narrow" de Intl es ambiguo: la mayoría de los datos
// CLDR no tienen un símbolo corto propio para estas monedas y caen de vuelta
// a "$", indistinguible de USD/BRL/etc. en el mismo listado. Se sobreescribe
// con el símbolo real ya definido en `currencies.symbol` (ver
// supabase/seed.sql) para no confundir a la dueña sobre en qué moneda está
// viendo un monto. Bug real detectado con GYD (Fase de rediseño de gráficos).
const SYMBOL_OVERRIDES: Record<string, string> = {
  GYD: "G$",
};

export function formatMoney(
  amountCents: number,
  currencyCode: string,
  locale: string
): string {
  const amount = amountCents / 100;
  const override = SYMBOL_OVERRIDES[currencyCode];
  try {
    if (override) {
      // Se formatea mostrando el código ISO (inequívoco) y luego se
      // reemplaza por el símbolo corto, conservando el formato numérico
      // correcto del locale (separadores, posición del signo, etc.).
      const withCode = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "code",
      }).format(amount);
      return withCode.replace(currencyCode, override);
    }

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    // Intl.NumberFormat no reconoce algunas monedas no estándar (ej. GYD en
    // ciertos motores). Fallback simple sin perder el valor.
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

// Patrón de validación para inputs de dinero en unidades del salón (nunca
// centavos): enteros o hasta 2 decimales, sin signo. Reutilizado por los
// esquemas Zod de cada módulo (servicios, trabajadores, ...).
export const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseMoneyToCents(value: string): number {
  return Math.round(Number.parseFloat(value) * 100);
}
