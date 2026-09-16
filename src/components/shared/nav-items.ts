import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Scissors,
  UserRound,
  Package,
  Wallet,
  Banknote,
  Landmark,
  BarChart3,
  Sparkles,
  Settings,
} from "lucide-react";

export type NavItem = {
  key:
    | "dashboard"
    | "requests"
    | "clients"
    | "services"
    | "staff"
    | "inventory"
    | "payments"
    | "cashClosures"
    | "finances"
    | "reports"
    | "ai"
    | "settings";
  href: string;
  icon: LucideIcon;
  enabled: boolean;
  // Oculta el enlace por completo (no "próximamente") a quien no tenga uno
  // de estos roles activos. Distinto de "reception ve solo lectura"
  // (services/staff): en "finances" el permiso real es cero, no lectura
  // (CLAUDE.md sección 7), así que ni siquiera se muestra el enlace.
  restrictedToRoles?: readonly string[];
};

// Los 13 módulos del sidebar (CLAUDE.md sección 6/9). Solo los módulos ya
// construidos ("dashboard" en Fase 0, "services" en Fase 1, "clients" y
// "staff" en Fase 5, "inventory" en Fase 7, "payments"/"cashClosures"/
// "finances" en Fase 6) tienen ruta real; el resto se muestra deshabilitado
// ("próximamente") para no crear enlaces rotos a fases futuras.
export const navItems: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { key: "requests", href: "/requests", icon: CalendarCheck, enabled: false },
  { key: "clients", href: "/clients", icon: Users, enabled: true },
  { key: "services", href: "/services", icon: Scissors, enabled: true },
  { key: "staff", href: "/staff", icon: UserRound, enabled: true },
  { key: "inventory", href: "/inventory", icon: Package, enabled: true },
  { key: "payments", href: "/payments", icon: Wallet, enabled: true },
  { key: "cashClosures", href: "/cash-closures", icon: Banknote, enabled: true },
  {
    key: "finances",
    href: "/finances",
    icon: Landmark,
    enabled: true,
    restrictedToRoles: ["owner"],
  },
  { key: "reports", href: "/reports", icon: BarChart3, enabled: false },
  { key: "ai", href: "/ai", icon: Sparkles, enabled: false },
  { key: "settings", href: "/settings", icon: Settings, enabled: false },
];
