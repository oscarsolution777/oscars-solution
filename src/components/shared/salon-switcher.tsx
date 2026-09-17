"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveSalonAction } from "@/lib/auth/actions";

type SalonOption = { id: string; name: string };

// Solo se monta cuando memberships.length > 1 (cadena de salones, CLAUDE.md
// sección 6 "memberships"): con un único salón, mostrar un selector sería
// ruido. Cambiar de salón recarga el panel entero (redirect a /dashboard)
// porque cada página del panel depende del salón activo de la sesión.
export function SalonSwitcher({
  salons,
  activeSalonId,
  activeSalonName,
}: {
  salons: SalonOption[];
  activeSalonId: string;
  activeSalonName: string;
}) {
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left outline-none hover:bg-white/5 disabled:opacity-60"
      >
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
          {activeSalonName}
        </p>
        <ChevronsUpDown size={14} className="shrink-0 text-sidebar-text" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <p className="px-2 py-1.5 text-xs font-medium text-text-muted">
          {t("salonSwitcher.label")}
        </p>
        {salons.map((salon) => (
          <DropdownMenuItem
            key={salon.id}
            onClick={() => {
              if (salon.id === activeSalonId) return;
              startTransition(() => {
                void setActiveSalonAction(salon.id);
              });
            }}
            className="flex items-center justify-between gap-2"
          >
            <span className="truncate">{salon.name}</span>
            {salon.id === activeSalonId && <Check size={14} className="shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
