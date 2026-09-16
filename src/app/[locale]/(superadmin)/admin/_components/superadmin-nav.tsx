"use client";

import { usePathname, Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export function SuperAdminNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-primary-light text-primary"
              : "text-text-secondary hover:bg-content-bg"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
