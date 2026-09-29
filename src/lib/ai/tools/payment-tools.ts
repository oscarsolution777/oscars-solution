import "server-only";
import { z } from "zod";
import { listPayments } from "@/lib/db/payments";
import { listClients } from "@/lib/db/clients";
import type { AiToolContext, AiToolDefinition } from "./types";

const listPaymentsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  clientId: z.string().uuid().optional(),
  method: z.enum(["cash", "card", "transfer", "other"]).optional(),
  status: z.enum(["pending", "paid", "refunded"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Pagos individuales están permitidos (a diferencia de otras herramientas
// que solo dan agregados) porque es exactamente lo que se pidió: "pagos
// individuales" en el chat. Lo que nunca se agrega es un dato de contacto
// del cliente -- solo su nombre, igual que en el resto de las herramientas.
export const listPaymentsTool: AiToolDefinition<z.infer<typeof listPaymentsSchema>> = {
  name: "list_payments",
  description:
    "Lista pagos individuales del salón (monto, método, estado, fecha, nombre del cliente), con filtros opcionales de fecha/cliente/método/estado. Más recientes primero.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Fecha inicial yyyy-MM-dd (opcional)" },
      to: { type: "string", description: "Fecha final yyyy-MM-dd (opcional)" },
      clientId: { type: "string", description: "id del cliente (opcional, obtenido con search_clients)" },
      method: { type: "string", enum: ["cash", "card", "transfer", "other"] },
      status: { type: "string", enum: ["pending", "paid", "refunded"] },
      limit: { type: "number", description: "Máximo de pagos a devolver (por defecto 20, máx. 100)" },
    },
  },
  schema: listPaymentsSchema,
  async execute(args, ctx: AiToolContext) {
    const [payments, clients] = await Promise.all([
      listPayments(ctx.supabase, ctx.salonId),
      listClients(ctx.supabase, ctx.salonId),
    ]);
    const clientsById = new Map(clients.map((c) => [c.id, c.full_name]));

    const filtered = payments.filter((p) => {
      if (args.clientId && p.client_id !== args.clientId) return false;
      if (args.method && p.method !== args.method) return false;
      if (args.status && p.status !== args.status) return false;
      const paidDate = p.paid_at?.slice(0, 10);
      if (args.from && (!paidDate || paidDate < args.from)) return false;
      if (args.to && (!paidDate || paidDate > args.to)) return false;
      return true;
    });

    return {
      currency: ctx.currency,
      payments: filtered.slice(0, args.limit ?? 20).map((p) => ({
        clientName: clientsById.get(p.client_id) ?? "—",
        amountCents: p.amount_cents,
        method: p.method,
        status: p.status,
        paidAt: p.paid_at,
      })),
    };
  },
};
