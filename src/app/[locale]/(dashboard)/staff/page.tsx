import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listStaff } from "@/lib/db/staff";
import { listServices } from "@/lib/db/services";
import { listServiceStaffForSalon } from "@/lib/db/service-staff";
import { EmptyState } from "@/components/shared/empty-state";
import { StaffView } from "./_components/staff-view";

const WRITE_ROLES = ["owner", "admin"] as const;

export default async function StaffPage() {
  const session = await requireAuth();
  const locale = await getLocale();
  const salon = session.activeMembership?.salon;

  if (!salon || !session.activeMembership) {
    const t = await getTranslations("dashboard");
    const tAuth = await getTranslations("auth.login");
    return <EmptyState title={t("welcomeTitle")} description={tAuth("noMembership")} />;
  }

  const supabase = await createClient();
  const [staff, services] = await Promise.all([
    listStaff(supabase, salon.id),
    listServices(supabase, salon.id),
  ]);

  const activeServices = services.filter((service) => service.is_active);
  const serviceStaffRows = await listServiceStaffForSalon(
    supabase,
    activeServices.map((service) => service.id)
  );

  const activeStaff = staff.filter((member) => member.is_active);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newThisMonth = activeStaff.filter(
    (member) => new Date(member.created_at) >= startOfMonth
  ).length;
  const monthlyPayrollCents = activeStaff.reduce(
    (sum, member) => sum + member.base_salary_cents,
    0
  );
  const servicesCovered = new Set(serviceStaffRows.map((row) => row.service_id)).size;

  return (
    <StaffView
      staff={staff}
      services={activeServices}
      serviceStaffRows={serviceStaffRows}
      kpis={{
        total: activeStaff.length,
        newThisMonth,
        servicesCovered,
        totalActiveServices: activeServices.length,
        monthlyPayrollCents,
      }}
      currency={salon.currency}
      timezone={salon.timezone}
      locale={locale}
      canWrite={WRITE_ROLES.includes(
        session.activeMembership.role as (typeof WRITE_ROLES)[number]
      )}
    />
  );
}
