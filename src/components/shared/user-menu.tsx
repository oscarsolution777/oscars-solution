"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/browser";
import { getInitials } from "@/lib/utils/text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordDialog } from "./change-password-dialog";

export function UserMenu({
  fullName,
  roleLabel,
  email,
}: {
  fullName: string;
  roleLabel: string;
  email: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const initials = getInitials(fullName);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary-light text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold text-text-primary">{fullName}</p>
          <p className="text-xs text-text-muted">{roleLabel}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
          {t("changePassword.menuItem")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ChangePasswordDialog
        email={email}
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </DropdownMenu>
  );
}
