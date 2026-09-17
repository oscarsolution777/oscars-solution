import type { Tables } from "@/types/database";
import type {
  ServiceSalesRow,
  StaffWorkloadRow,
  ClientSegments,
} from "@/lib/reports/aggregations";
import { OperationalCards } from "./operational-cards";
import { FinancialCards } from "./financial-cards";
import { TopServicesChart } from "./top-services-chart";
import { StaffWorkloadList } from "./staff-workload-list";
import { ClientSegmentsCard } from "./client-segments-card";
import { QrPortalCard } from "./qr-portal-card";

type ProductRow = Tables<"products">;

export function DashboardView(
  props:
    | {
        variant: "reception";
        locale: string;
        currency: string;
        operational: {
          pendingRequestsCount: number;
          todayAppointmentsCount: number;
          lowStockProducts: ProductRow[];
        };
      }
    | {
        variant: "full";
        locale: string;
        currency: string;
        operational: {
          pendingRequestsCount: number;
          todayAppointmentsCount: number;
          lowStockProducts: ProductRow[];
        };
        financial: {
          incomeCents: number;
          completedCount: number;
          noShowRate: number;
          avgTicketCents: number;
          cashDifferenceCents: number;
        };
        topServices: ServiceSalesRow[];
        staffWorkload: StaffWorkloadRow[];
        clientSegments: ClientSegments;
        qrPortal: { url: string; dataUrl: string };
      }
) {
  return (
    <div className="space-y-6">
      {props.variant === "full" && (
        <FinancialCards financial={props.financial} currency={props.currency} locale={props.locale} />
      )}

      {props.variant === "full" && (
        <QrPortalCard qrDataUrl={props.qrPortal.dataUrl} portalUrl={props.qrPortal.url} />
      )}

      <OperationalCards operational={props.operational} />

      {props.variant === "full" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopServicesChart
            services={props.topServices}
            currency={props.currency}
            locale={props.locale}
          />
          <div className="space-y-4">
            <StaffWorkloadList staffWorkload={props.staffWorkload} />
            <ClientSegmentsCard segments={props.clientSegments} />
          </div>
        </div>
      )}
    </div>
  );
}
