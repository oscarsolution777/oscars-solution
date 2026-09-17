"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { membershipRoles } from "@/lib/validations/salons";
import { updateSalonMembershipAction } from "../actions";
import { useSettingsErrorMessage } from "./use-settings-error-message";
import type { listSalonMembers } from "@/lib/db/memberships";

type Member = Awaited<ReturnType<typeof listSalonMembers>>[number];

// Solo administra membresías ya existentes (decisión de alcance confirmada
// para esta fase): sin invitar gente nueva, solo ver/cambiar rol y
// activar/desactivar. La propia fila del owner que mira esto está siempre
// deshabilitada (update_salon_membership también lo rechaza server-side,
// doble capa CLAUDE.md sección 7) para que no pueda bloquearse a sí misma.
export function MembersTab({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const t = useTranslations("settings.members");
  const tRoles = useTranslations("settings.members.roles");
  const router = useRouter();
  const errorMessage = useSettingsErrorMessage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const applyChange = (membershipId: string, role: string, isActive: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await updateSalonMembershipAction(membershipId, role, isActive);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  if (members.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-xs text-danger">
          {errorMessage(error)}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("columnEmail")}</TableHead>
              <TableHead>{t("columnRole")}</TableHead>
              <TableHead>{t("columnStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.user_id === currentUserId;
              return (
                <TableRow key={member.membership_id}>
                  <TableCell className="font-medium text-text-primary">
                    {member.full_name}
                    {isSelf && (
                      <Badge variant="outline" className="ml-2">
                        {t("youBadge")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-text-secondary">{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(role) => {
                        if (role) applyChange(member.membership_id, role, member.is_active);
                      }}
                      items={Object.fromEntries(membershipRoles.map((r) => [r, tRoles(r)]))}
                    >
                      <SelectTrigger disabled={isSelf || isPending} size="sm" className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {membershipRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {tRoles(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={member.is_active}
                      disabled={isSelf || isPending}
                      onCheckedChange={(checked) =>
                        applyChange(member.membership_id, member.role, checked)
                      }
                      aria-label={t("columnStatus")}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
