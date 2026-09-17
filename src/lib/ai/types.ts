// Objeto de entrada para el proveedor de IA (CLAUDE.md sección 9). Se
// construye siempre a partir de agregados ya calculados en
// src/lib/reports/aggregations.ts — nunca de filas individuales de
// clientes/pagos, para cumplir "cero datos personales en el prompt"
// (CLAUDE.md sección 7.8).

export interface TopServiceMetric {
  name: string;
  units: number;
  revenueCents: number;
}

export interface StaffWorkloadMetric {
  name: string;
  assignedCount: number;
  revenueCents: number;
}

export interface LowStockProductMetric {
  name: string;
  stockQty: number;
  minStock: number;
}

export interface BusinessMetrics {
  periodFrom: string; // yyyy-MM-dd
  periodTo: string; // yyyy-MM-dd
  currency: string;
  incomeCents: number;
  completedAppointmentsCount: number;
  noShowRate: number; // 0..1
  avgTicketCents: number;
  topServices: TopServiceMetric[];
  staffWorkload: StaffWorkloadMetric[];
  newClientsCount: number;
  recurringClientsCount: number;
  pendingRequestsCount: number;
  lowStockProducts: LowStockProductMetric[];
  cashDifferenceCents: number;
}
