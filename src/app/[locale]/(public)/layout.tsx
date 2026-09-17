import type { ReactNode } from "react";

// Portal del cliente (CLAUDE.md sección 1, subsistema A): sin sidebar, sin
// sesión. Fondo simple, mobile-first — contraste con el shell del panel de
// gestión que sí requiere login.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
