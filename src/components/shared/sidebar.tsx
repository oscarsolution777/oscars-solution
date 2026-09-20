"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/lib/i18n/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { SalonSwitcher } from "./salon-switcher";

export function Sidebar({
  salonName,
  logoUrl,
  role,
  salons,
  activeSalonId,
}: {
  salonName: string;
  logoUrl?: string | null;
  role: string;
  salons?: { id: string; name: string }[];
  activeSalonId?: string;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  // "finances" (y cualquier otro módulo futuro con restrictedToRoles) no se
  // muestra en absoluto a quien no tenga el rol requerido — CLAUDE.md
  // sección 7: admin/reception tienen CERO acceso, no solo lectura.
  const visibleItems = navItems.filter(
    (item) => !item.restrictedToRoles || item.restrictedToRoles.includes(role)
  );

  return (
    <aside className="flex w-[200px] shrink-0 flex-col bg-sidebar-bg text-sidebar-text">
      <div className="flex items-center gap-2 px-4 py-5">
        <Link
          href="/settings"
          className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary transition-opacity hover:opacity-80"
          title={t("settings")}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt={salonName} width={32} height={32} className="h-8 w-8 object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center text-sm font-semibold text-white">
              {salonName.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          {salons && salons.length > 1 && activeSalonId ? (
            <SalonSwitcher salons={salons} activeSalonId={activeSalonId} activeSalonName={salonName} />
          ) : (
            <p className="truncate text-sm font-semibold text-white">{salonName}</p>
          )}
          <p className="truncate text-xs text-sidebar-text">Salón de Belleza</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.enabled && pathname === item.href;

          if (!item.enabled) {
            return (
              <div
                key={item.key}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-[15px] text-sidebar-text/50"
                title={t("comingSoon")}
              >
                <Icon size={18} />
                <span className="truncate">{t(item.key)}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] transition-colors",
                isActive
                  ? "bg-sidebar-active-bg text-sidebar-active-text"
                  : "text-sidebar-text hover:bg-white/5"
              )}
            >
              <Icon size={18} />
              <span className="truncate">{t(item.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
