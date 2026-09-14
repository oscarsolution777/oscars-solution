// El dinero se guarda SIEMPRE en céntimos (price_cents: integer). El
// formateo a texto legible ocurre únicamente aquí, en la capa de
// presentación (CLAUDE.md sección 5, regla "Dinero").

export function formatMoney(
  amountCents: number,
  currencyCode: string,
  locale: string
): string {
  const amount = amountCents / 100;
  try {
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
