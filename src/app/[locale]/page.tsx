import { getLocale } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/i18n/navigation";

// Sin landing/marketing en el alcance de CLAUDE.md: redirige según sesión.
export default async function RootPage() {
  const [session, locale] = await Promise.all([
    getCurrentSession(),
    getLocale(),
  ]);
  redirect({ href: session ? "/dashboard" : "/login", locale });
}
