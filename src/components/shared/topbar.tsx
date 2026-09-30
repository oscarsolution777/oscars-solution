import { CalendarDays } from "lucide-react";
import { getLocale } from "next-intl/server";
import { formatSalonDate } from "@/lib/utils/dates";
import { PanelLocaleSwitcher } from "./panel-locale-switcher";
import { UserMenu } from "./user-menu";

export async function Topbar({
  title,
  subtitle,
  userFullName,
  userRoleLabel,
  userEmail,
  salonTimezone,
}: {
  title: string;
  subtitle?: string;
  userFullName: string;
  userRoleLabel: string;
  userEmail: string;
  salonTimezone: string;
}) {
  const locale = await getLocale();
  // "Hoy" es un instante (equivalente a un timestamptz), así que se calcula
  // en la zona horaria del salón, no en la del servidor (Vercel corre en
  // UTC) — mismo patrón que el resto del proyecto (CLAUDE.md sección 5,
  // "Fechas"). Sin esto, a partir de cierta hora de la tarde en salones
  // detrás de UTC (ej. America/Guyana, UTC-4) esta fecha se adelantaba un
  // día porque en UTC ya era el día siguiente.
  const today = formatSalonDate(new Date(), salonTimezone, locale, "PPP");

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
        <PanelLocaleSwitcher />
        <UserMenu fullName={userFullName} roleLabel={userRoleLabel} email={userEmail} />
      </div>
    </header>
  );
}
