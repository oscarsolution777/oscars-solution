"use client";

import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/lib/i18n/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function Sidebar({ salonName }: { salonName: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <aside className="flex w-[200px] shrink-0 flex-col bg-sidebar-bg text-sidebar-text">
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="h-8 w-8 shrink-0 rounded-full bg-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{salonName}</p>
          <p className="truncate text-xs text-sidebar-text">Salón de Belleza</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
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
