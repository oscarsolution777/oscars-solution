import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) {
    redirect({ href: "/dashboard", locale: await getLocale() });
  }

  const t = await getTranslations("auth.login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-content-bg px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
