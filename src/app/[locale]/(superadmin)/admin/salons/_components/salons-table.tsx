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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { usePagination } from "@/lib/utils/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatSalonDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";
import { SalonStatusBadge } from "./salon-status-badge";
import { ResetSalonDialog } from "./reset-salon-dialog";
import { EditSlugDialog } from "./edit-slug-dialog";
import { CreateMemberAccountDialog } from "./create-member-account-dialog";
import { setSalonStatusAction, convertDemoToRealAction } from "../actions";
import { setActiveSalonAction } from "@/lib/auth/actions";

type SalonRow = Tables<"salons">;

export function SalonsTable({
  salons,
  locale,
  onMemberAccountCreated,
}: {
  salons: SalonRow[];
  locale: string;
  onMemberAccountCreated: (credentials: { email: string; temporaryPassword: string }) => void;
}) {
  const t = useTranslations("superadmin.salons.table");
  const tConvert = useTranslations("superadmin.salons.convertDialog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Salón pendiente de confirmar suspensión (acción destructiva para la
  // dueña: le corta el acceso al panel — CLAUDE.md sección 12, "acciones
  // destructivas siempre con confirmación").
  const [salonToSuspend, setSalonToSuspend] = useState<SalonRow | null>(null);
  // Salón pendiente del borrado destructivo "Reiniciar salón" (sin vuelta
  // atrás, ver reset-salon-dialog.tsx).
  const [salonToReset, setSalonToReset] = useState<SalonRow | null>(null);
  // Punto 3 del bloque de ajustes posterior a Fase 10: "Convertir a salón
  // real" (deja de ser demo, no borra sus datos) y "Editar slug" (ver
  // edit-slug-dialog.tsx) -- ambas acciones nuevas, con su propia
  // confirmación (CLAUDE.md sección 12).
  const [salonToConvert, setSalonToConvert] = useState<SalonRow | null>(null);
  const [salonToEditSlug, setSalonToEditSlug] = useState<SalonRow | null>(null);
  // Punto 17 del bloque de ajustes: crear cuenta admin/recepcionista para
  // un salón existente, con el mismo patrón de "key nueva en cada apertura"
  // que EditSlugDialog/ResetSalonDialog.
  const [salonToCreateMember, setSalonToCreateMember] = useState<SalonRow | null>(null);
  const [createMemberDialogKey, setCreateMemberDialogKey] = useState(0);
  // Fuerzan un remount completo de ResetSalonDialog/EditSlugDialog en cada
  // apertura (incluso para el mismo salón dos veces seguidas): es la forma
  // recomendada por React de "resetear todo el estado" sin hacerlo a mano
  // con setState dentro de un efecto -- ver el comentario en cada diálogo.
  const [resetDialogKey, setResetDialogKey] = useState(0);
  const [editSlugDialogKey, setEditSlugDialogKey] = useState(0);
  // Paginación (bloque de ajustes posterior a Fase 10, punto 10): mismo
  // patrón/tamaño de página (20) que Pagos/Cuadre de caja/Reportes -- esta
  // tabla no la tenía y podía crecer sin límite con el número de salones.
  const { page, setPage, totalPages, pageItems } = usePagination(salons);

  if (salons.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const applyStatus = (salon: SalonRow, next: "active" | "suspended") => {
    startTransition(async () => {
      const result = await setSalonStatusAction(salon.id, next);
      if (result.ok) router.refresh();
    });
  };

  const applyConvert = (salon: SalonRow) => {
    startTransition(async () => {
      const result = await convertDemoToRealAction(salon.id);
      if (result.ok) router.refresh();
    });
  };

  // "Activo" es el único estado que se puede suspender; cualquier otro
  // (trial, suspended, cancelled) se reactiva con el mismo botón — antes solo
  // alternaba entre active/suspended y una demo en "trial" nunca podía
  // pasar a "active" desde esta tabla.
  const isActive = (salon: SalonRow) => salon.subscription_status === "active";

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-card-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnCurrency")}</TableHead>
            <TableHead>{t("columnLocale")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnDemo")}</TableHead>
            <TableHead>{t("columnCreatedAt")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.map((salon) => (
            <TableRow key={salon.id}>
              <TableCell>
                <div className="font-medium text-text-primary">{salon.name}</div>
                <div className="text-xs text-text-muted">{salon.slug}</div>
              </TableCell>
              <TableCell>{salon.currency}</TableCell>
              <TableCell className="uppercase text-text-secondary">
                {salon.default_locale}
              </TableCell>
              <TableCell>
                <SalonStatusBadge status={salon.subscription_status as "trial" | "active" | "suspended" | "cancelled"} />
              </TableCell>
              <TableCell>
                {salon.is_demo ? (
                  <Badge variant="secondary">
                    {salon.demo_expires_at
                      ? t("demoExpiresOn", {
                          date: formatSalonDate(salon.demo_expires_at, salon.timezone, locale),
                        })
                      : "—"}
                  </Badge>
                ) : (
                  <span className="text-text-muted">{t("notDemo")}</span>
                )}
              </TableCell>
              <TableCell className="text-text-secondary">
                {formatSalonDate(salon.created_at, salon.timezone, locale)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {/* Punto pedido por Oscar: antes no había forma de entrar a
                      propósito al panel de gestión de un salón concreto desde
                      SuperAdmin -- había que escribir /dashboard a mano y se
                      caía en memberships[0] (orden arbitrario). Reutiliza la
                      misma Server Action del SalonSwitcher: fija la cookie
                      active_salon_id a este salón (valida la membership del
                      lado del servidor) y redirige a /dashboard. Desde ahí el
                      SalonSwitcher ya permite moverse a cualquier otro. */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(() => {
                        void setActiveSalonAction(salon.id);
                      })
                    }
                  >
                    {t("enterAction")}
                  </Button>
                  {isActive(salon) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setSalonToSuspend(salon)}
                    >
                      {t("suspendAction")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => applyStatus(salon, "active")}
                    >
                      {t("activateAction")}
                    </Button>
                  )}
                  {salon.is_demo && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setSalonToConvert(salon)}
                    >
                      {t("convertAction")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setSalonToEditSlug(salon);
                      setEditSlugDialogKey((k) => k + 1);
                    }}
                  >
                    {t("editSlugAction")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setSalonToCreateMember(salon);
                      setCreateMemberDialogKey((k) => k + 1);
                    }}
                  >
                    {t("createMemberAction")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => {
                      setSalonToReset(salon);
                      setResetDialogKey((k) => k + 1);
                    }}
                  >
                    {t("resetAction")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AlertDialog open={salonToSuspend !== null} onOpenChange={(open) => !open && setSalonToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("suspendDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("suspendDialog.description", { name: salonToSuspend?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("suspendDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (salonToSuspend) applyStatus(salonToSuspend, "suspended");
                setSalonToSuspend(null);
              }}
            >
              {t("suspendDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={salonToConvert !== null} onOpenChange={(open) => !open && setSalonToConvert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConvert("title", { name: salonToConvert?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{tConvert("description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tConvert("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (salonToConvert) applyConvert(salonToConvert);
                setSalonToConvert(null);
              }}
            >
              {tConvert("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSlugDialog
        key={editSlugDialogKey}
        salon={salonToEditSlug}
        open={salonToEditSlug !== null}
        onOpenChange={(open) => !open && setSalonToEditSlug(null)}
      />

      <ResetSalonDialog
        key={resetDialogKey}
        salon={salonToReset}
        open={salonToReset !== null}
        onOpenChange={(open) => !open && setSalonToReset(null)}
      />

      <CreateMemberAccountDialog
        key={createMemberDialogKey}
        salon={salonToCreateMember}
        open={salonToCreateMember !== null}
        onOpenChange={(open) => !open && setSalonToCreateMember(null)}
        onCreated={onMemberAccountCreated}
      />
    </div>
  );
}
