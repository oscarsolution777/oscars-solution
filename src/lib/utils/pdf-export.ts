// Exportación a PDF de Reportes — 100% cliente (jspdf se importa dinámicamente
// para no engordar el bundle inicial). Diseño inspirado en un recibo contable:
// cabecera con marca, bloque de datos y tabla con color de marca.

const BRAND_PRIMARY: [number, number, number] = [232, 55, 90]; // --primary #e8375a
const TEXT_DARK: [number, number, number] = [31, 41, 55];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const ROW_ALT: [number, number, number] = [243, 244, 246]; // --secondary #f3f4f6

export interface PdfExportOptions {
  title: string;
  salonName: string;
  metaLines: string[];
  rows: Record<string, string | number>[];
  filename: string;
  pageLabel: (page: number, total: number) => string;
}

export async function exportRowsToPdf(options: PdfExportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Marca vectorial: cuadro redondeado con inicial + nombre.
  doc.setFillColor(...BRAND_PRIMARY);
  doc.roundedRect(margin, 12, 12, 12, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("O", margin + 6, 20.2, { align: "center" });

  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(13);
  doc.text("Oscar's Solution", margin + 16, 20);

  // Título del reporte y salón, alineados a la derecha.
  doc.setFontSize(16);
  doc.text(options.title, pageWidth - margin, 17, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(options.salonName, pageWidth - margin, 23, { align: "right" });

  doc.setDrawColor(...BRAND_PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(margin, 29, pageWidth - margin, 29);

  // Bloque de datos (periodo, fecha de generación...).
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  let y = 36;
  for (const line of options.metaLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  const columns = options.rows.length > 0 ? Object.keys(options.rows[0]) : [];
  autoTable(doc, {
    startY: y + 2,
    head: [columns],
    body: options.rows.map((row) => columns.map((col) => String(row[col] ?? ""))),
    margin: { left: margin, right: margin, bottom: 18 },
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: TEXT_DARK },
    headStyles: { fillColor: BRAND_PRIMARY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: ROW_ALT },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setDrawColor(...ROW_ALT);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Oscar's Solution", margin, pageHeight - 9);
    doc.text(options.pageLabel(page, totalPages), pageWidth - margin, pageHeight - 9, {
      align: "right",
    });
  }

  doc.save(options.filename);
}
