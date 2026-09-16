"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginInput) => {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);

    startTransition(async () => {
      const result = await login(formData);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push(result.redirectTo);
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-danger">{t("invalidCredentials")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{t("passwordLabel")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-danger">{t("invalidCredentials")}</p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-xs text-danger">
          {t("invalidCredentials")}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? tCommon("loading") : t("submit")}
      </Button>
    </form>
  );
}
