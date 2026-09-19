// Paleta compartida para series de gráficos (donuts, barras agrupadas) que
// necesitan más de un color. Reutiliza los tokens semánticos ya definidos en
// globals.css en vez de inventar colores nuevos, para que los gráficos
// combinen con el resto de la UI (KPI cards, badges, etc.).
export const CHART_SERIES_COLORS = [
  "var(--color-primary)",
  "var(--color-info)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-danger)",
] as const;
