import { CalendarDays } from "lucide-react";
import { UserMenu } from "./user-menu";

export function Topbar({
  title,
  subtitle,
  userFullName,
  userRoleLabel,
}: {
  title: string;
  subtitle?: string;
  userFullName: string;
  userRoleLabel: string;
}) {
  const today = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="flex h-16 items-center justify-between border-b border-topbar-border bg-topbar-bg px-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-text-primary">{title}</h1>
        {subtitle && (
          <p className="truncate text-sm text-text-secondary">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-1.5 text-sm font-medium text-text-secondary md:flex">
          <CalendarDays size={16} />
          <span>{today}</span>
        </div>
        <UserMenu fullName={userFullName} roleLabel={userRoleLabel} />
      </div>
    </header>
  );
}
