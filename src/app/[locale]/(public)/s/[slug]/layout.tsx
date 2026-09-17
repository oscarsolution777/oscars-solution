import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSalonBySlug } from "@/lib/db/salons";
import { LocaleSwitcher } from "./_components/locale-switcher";

// Resuelve el salón por slug una vez para el header. Cada página hija vuelve
// a resolverlo para sus propias consultas (mismo patrón ya usado en el panel:
// cada page.tsx llama requireAuth()/getSalonById() de forma independiente,
// nunca se pasa por props entre layout y page).
export default async function SalonPortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const salon = await getSalonBySlug(supabase, slug);

  // salons_select_anon (migración 0013) ya filtra is_active/subscription_status:
  // un salón suspendido o inexistente simplemente no devuelve fila.
  if (!salon) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="flex items-center justify-between border-b border-card-border px-4 py-3">
        <div className="flex items-center gap-2">
          {salon.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.logo_url}
              alt={salon.name}
              className="size-8 rounded-full object-cover"
            />
          )}
          <span className="font-heading text-sm font-medium text-text-primary">{salon.name}</span>
        </div>
        <LocaleSwitcher />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
