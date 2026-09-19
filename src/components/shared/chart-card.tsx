import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

// Wrapper compartido para todos los gráficos de Recharts del panel (rediseño
// "más gráficos" de Dashboard/Inventario/Pagos/Cuadre de caja/Finanzas/
// Reportes): antes cada módulo repetía el mismo Card + ResponsiveContainer +
// estado vacío a mano (ver top-services-chart.tsx, sales-chart.tsx...).
export function ChartCard({
  title,
  isEmpty,
  emptyTitle,
  height = 256,
  children,
}: {
  title: string;
  isEmpty: boolean;
  emptyTitle: string;
  height?: number;
  children: ReactElement;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {children}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
