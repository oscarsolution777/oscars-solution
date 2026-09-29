// Exportación a PDF de Reportes — 100% cliente (jspdf se importa dinámicamente
// para no engordar el bundle inicial). Diseño inspirado en un recibo contable:
// cabecera con marca, bloque de datos y tabla con color de marca.

const BRAND_PRIMARY: [number, number, number] = [232, 55, 90]; // --primary #e8375a
const TEXT_DARK: [number, number, number] = [31, 41, 55];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const ROW_ALT: [number, number, number] = [243, 244, 246]; // --secondary #f3f4f6

const LOGO_URL = "/brand/oscars-solution-logo.png";

// Cacheado en memoria: varias exportaciones seguidas en la misma sesión no
// vuelven a pedir el archivo. Solo tiene sentido en el navegador (esta
// función entera es "100% cliente", ver comentario de arriba).
let cachedLogo: HTMLImageElement | null = null;

function loadLogoImage(): Promise<HTMLImageElement> {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cachedLogo = img;
      resolve(img);
    };
    img.onerror = () => reject(new Error("No se pudo cargar el logo para el PDF"));
    img.src = LOGO_URL;
  });
}

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

  // Logo real de la marca (public/brand/oscars-solution-logo.png), a la misma
  // altura (12mm) que antes ocupaba el placeholder vectorial. Si por lo que
  // sea no carga (archivo movido, entorno raro), se degrada al texto solo en
  // vez de romper la exportación completa.
  const logoHeight = 12;
  try {
    const logo = await loadLogoImage();
    const logoWidth = logoHeight * (logo.naturalWidth / logo.naturalHeight);
    doc.addImage(logo, "PNG", margin, 12, logoWidth, logoHeight);
  } catch {
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Oscar's Solution", margin, 20);
  }

  // Título del reporte y salón, alineados a la derecha.
  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
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
