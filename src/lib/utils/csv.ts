// Exportación a CSV (Fase 8): puro, sin DOM — el disparo de la descarga
// (Blob + <a download>) vive en el componente de cliente que lo usa.

export function rowsToCsv(rows: Record<string, string | number>[], headers?: string[]): string {
  if (rows.length === 0) return "";
  const columns = headers ?? Object.keys(rows[0]);

  const escape = (value: string | number | undefined): string => {
    const str = String(value ?? "");
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => escape(row[col])).join(","));
  }
  return lines.join("\n");
}
