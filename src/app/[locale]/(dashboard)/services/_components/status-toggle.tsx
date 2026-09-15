"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { Switch } from "@/components/ui/switch";
import { DeactivateConfirmDialog } from "./deactivate-confirm-dialog";

export function StatusToggle({
  id,
  name,
  isActive,
  disabled,
  action,
}: {
  id: string;
  name: string;
  isActive: boolean;
  disabled?: boolean;
  action: (id: string, isActive: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const applyChange = (next: boolean) => {
    startTransition(async () => {
      const result = await action(id, next);
      if (result.ok) {
        router.refresh();
      }
    });
  };

  const handleCheckedChange = (checked: boolean) => {
    if (!checked) {
      setConfirmOpen(true);
      return;
    }
    applyChange(true);
  };

  return (
    <>
      <Switch
        checked={isActive}
        disabled={disabled || isPending}
        onCheckedChange={handleCheckedChange}
        aria-label={t("save")}
      />
      <DeactivateConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        itemName={name}
        onConfirm={() => {
          setConfirmOpen(false);
          applyChange(false);
        }}
      />
    </>
  );
}
