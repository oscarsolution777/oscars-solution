import "server-only";
import QRCode from "qrcode";

// Genera el QR del portal público de un salón como data URI (PNG), 100%
// server-side — sin canvas ni JS de cliente (CLAUDE.md sección 9, "generación
// del QR" de la Fase 2). Se codifica con salon.default_locale para que el
// primer visitante caiga directo en el idioma del salón.
export function buildPortalUrl(slug: string, defaultLocale: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${appUrl}/${defaultLocale}/s/${slug}`;
}

export async function generatePortalQrDataUrl(portalUrl: string): Promise<string> {
  return QRCode.toDataURL(portalUrl, { margin: 1, width: 256 });
}
