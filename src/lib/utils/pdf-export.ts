// Exportación a PDF de Reportes — 100% cliente (jspdf se importa dinámicamente
// para no engordar el bundle inicial). Diseño inspirado en un recibo contable:
// cabecera con marca, bloque de datos y tabla con color de marca.

const BRAND_PRIMARY: [number, number, number] = [232, 55, 90]; // --primary #e8375a
const TEXT_DARK: [number, number, number] = [31, 41, 55];
const TEXT_MUTED: [number, number, number] = [107, 114, 128];
const ROW_ALT: [number, number, number] = [243, 244, 246]; // --secondary #f3f4f6

// El logo de este PDF es el del SALÓN (salons.logo_url, subido por la propia
// dueña en Configuración) -- nunca el de Oscar's Solution. Este reporte le
// pertenece a ella y muestra sus propios datos; ponerle la marca de la
// agencia encima sería mezclar la identidad de su negocio con la del
// proveedor del software. El logo de Oscar's Solution sí tiene sentido en el
// Panel SuperAdmin (esa sí es la herramienta interna de la agencia), pero no
// aquí. Cacheado por URL: varias exportaciones seguidas en la misma sesión
// no vuelven a pedir el archivo. Solo tiene sentido en el navegador (esta
// función entera es "100% cliente", ver comentario de arriba).
const logoCache = new Map<string, HTMLImageElement>();

function loadLogoImage(url: string): Promise<HTMLImageElement> {
  const cached = logoCache.get(url);
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve, reject) => {
    const img = new Image();
    // El logo del salón vive en Supabase Storage (otro origen) -- sin esto,
    // el navegador puede negarse a dejar que jsPDF lea los píxeles de la
    // imagen al insertarla en el PDF.
    img.crossOrigin = "anonymous";
    img.onload = () => {
      logoCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("No se pudo cargar el logo del salón para el PDF"));
    img.src = url;
  });
}

export interface PdfExportOptions {
  title: string;
  salonName: string;
  salonLogoUrl: string | null;
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

  // Logo del salón, a 12mm de alto. Si no tiene uno subido (o falla la
  // carga: red, CORS, archivo borrado...) se degrada al nombre del salón en
  // texto, nunca al logo de Oscar's Solution ni a un error que rompa la
  // exportación completa.
  const logoHeight = 12;
  let logoLoaded = false;
  if (options.salonLogoUrl) {
    try {
      const logo = await loadLogoImage(options.salonLogoUrl);
      const logoWidth = logoHeight * (logo.naturalWidth / logo.naturalHeight);
      doc.addImage(logo, "PNG", margin, 12, logoWidth, logoHeight);
      logoLoaded = true;
    } catch {
      // sigue al fallback de texto de abajo
    }
  }
  if (!logoLoaded) {
    doc.setTextColor(...TEXT_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(options.salonName, margin, 20);
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
