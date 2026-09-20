import type { Tables } from "@/types/database";
import type { Period } from "@/lib/utils/period";
import type {
  SalesBucket,
  ServiceSalesRow,
  StaffWorkloadRow,
  ClientSegments,
} from "@/lib/reports/aggregations";
import { PeriodSelector } from "@/components/shared/period-selector";
import { OperationalCards } from "./operational-cards";
import { FinancialCards } from "./financial-cards";
import { RevenueTrendChart } from "./revenue-trend-chart";
import { TopServicesChart } from "./top-services-chart";
import { StaffWorkloadChart } from "./staff-workload-chart";
import { ClientSegmentsChart } from "./client-segments-chart";
import { CompletionBreakdownChart } from "./completion-breakdown-chart";

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
        period: Period;
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
        revenueTrend: SalesBucket[];
        topServices: ServiceSalesRow[];
        staffWorkload: StaffWorkloadRow[];
        clientSegments: ClientSegments;
        completionBreakdown: { completed: number; noShow: number };
      }
) {
  return (
    <div className="space-y-6">
      {props.variant === "full" && (
        <div className="flex justify-end">
          <PeriodSelector period={props.period} namespace="dashboard.period" />
        </div>
      )}

      {props.variant === "full" && (
        <FinancialCards
          financial={props.financial}
          currency={props.currency}
          locale={props.locale}
          period={props.period}
        />
      )}

      <OperationalCards operational={props.operational} />

      {props.variant === "full" && (
        <>
          <RevenueTrendChart
            buckets={props.revenueTrend}
            currency={props.currency}
            locale={props.locale}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopServicesChart
              services={props.topServices}
              currency={props.currency}
              locale={props.locale}
            />
            <StaffWorkloadChart staffWorkload={props.staffWorkload} />
            <ClientSegmentsChart segments={props.clientSegments} />
            <CompletionBreakdownChart
              completed={props.completionBreakdown.completed}
              noShow={props.completionBreakdown.noShow}
            />
          </div>
        </>
      )}
    </div>
  );
}
