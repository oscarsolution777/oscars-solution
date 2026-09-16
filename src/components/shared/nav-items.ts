import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Scissors,
  UserRound,
  Package,
  Wallet,
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
    | "finances"
    | "reports"
    | "ai"
    | "settings";
  href: string;
  icon: LucideIcon;
  enabled: boolean;
};

// Los 12 módulos del sidebar (CLAUDE.md sección 6/9). Solo los módulos ya
// construidos ("dashboard" en Fase 0, "services" en Fase 1, "clients" y
// "staff" en Fase 5, "inventory" en Fase 7) tienen ruta real; el resto se
// muestra deshabilitado ("próximamente") para no crear enlaces rotos a
// fases futuras.
export const navItems: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { key: "requests", href: "/requests", icon: CalendarCheck, enabled: false },
  { key: "clients", href: "/clients", icon: Users, enabled: true },
  { key: "services", href: "/services", icon: Scissors, enabled: true },
  { key: "staff", href: "/staff", icon: UserRound, enabled: true },
  { key: "inventory", href: "/inventory", icon: Package, enabled: true },
  { key: "payments", href: "/payments", icon: Wallet, enabled: false },
  { key: "finances", href: "/finances", icon: Landmark, enabled: false },
  { key: "reports", href: "/reports", icon: BarChart3, enabled: false },
  { key: "ai", href: "/ai", icon: Sparkles, enabled: false },
  { key: "settings", href: "/settings", icon: Settings, enabled: false },
];
