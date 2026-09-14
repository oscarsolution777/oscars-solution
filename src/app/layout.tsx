import type { ReactNode } from "react";

// Layout raíz mínimo: next-intl exige que <html>/<body> vivan en
// src/app/[locale]/layout.tsx (donde sí se conoce el idioma activo).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
