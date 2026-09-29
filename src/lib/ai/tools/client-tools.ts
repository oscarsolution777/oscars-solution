import "server-only";
import { z } from "zod";
import { listClients } from "@/lib/db/clients";
import { listAppointments, listAppointmentItemsForAppointments } from "@/lib/db/appointments";
import { listServices } from "@/lib/db/services";
import type { AiToolContext, AiToolDefinition } from "./types";

// Reglas de privacidad de esta herramienta (CLAUDE.md sección 7.8, revisada
// para el chat de IA): nunca se devuelve phone/email/notes de un cliente,
// solo nombre + agregados (gasto total, nº de visitas, servicios más
// consumidos). Las filas de `clients` sí traen esos campos (listClients no
// los excluye, se reutiliza tal cual el resto de la app), pero aquí se
// mapean explícitamente a un objeto nuevo que nunca los incluye -- eso es
// lo único que llega al prompt del modelo.

const searchClientsSchema = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(20).optional(),
});

export const searchClientsTool: AiToolDefinition<z.infer<typeof searchClientsSchema>> = {
  name: "search_clients",
  description:
    "Busca clientes del salón por nombre (coincidencia parcial, sin distinguir mayúsculas). Devuelve nombre y agregados (gasto total, última visita), nunca teléfono/email/notas.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Texto a buscar en el nombre del cliente" },
      limit: { type: "number", description: "Máximo de resultados (por defecto 10, máx. 20)" },
    },
    required: ["query"],
  },
  schema: searchClientsSchema,
  async execute(args, ctx: AiToolContext) {
    const clients = await listClients(ctx.supabase, ctx.salonId);
    const query = args.query.toLowerCase();
    const matches = clients
      .filter((c) => c.is_active && c.full_name.toLowerCase().includes(query))
      .slice(0, args.limit ?? 10)
      .map((c) => ({
        id: c.id,
        fullName: c.full_name,
        totalSpentCents: c.total_spent_cents,
        lastVisitAt: c.last_visit_at,
      }));
    return { clients: matches };
  },
};

const getClientDetailSchema = z.object({
  clientId: z.string().uuid(),
});

export const getClientDetailTool: AiToolDefinition<z.infer<typeof getClientDetailSchema>> = {
  name: "get_client_detail",
  description:
    "Resumen de un cliente por su id: gasto total, primera/última visita, número de visitas completadas y sus servicios más consumidos. Nunca incluye teléfono/email/notas.",
  inputSchema: {
    type: "object",
    properties: {
      clientId: { type: "string", description: "id del cliente (obtenido con search_clients)" },
    },
    required: ["clientId"],
  },
  schema: getClientDetailSchema,
  async execute(args, ctx: AiToolContext) {
    const clients = await listClients(ctx.supabase, ctx.salonId);
    const client = clients.find((c) => c.id === args.clientId);
    if (!client) throw new Error("client_not_found");

    const [appointments, services] = await Promise.all([
      listAppointments(ctx.supabase, ctx.salonId),
      listServices(ctx.supabase, ctx.salonId),
    ]);
    const clientAppointments = appointments.filter(
      (a) => a.client_id === client.id && a.status === "completed"
    );
    const items = await listAppointmentItemsForAppointments(
      ctx.supabase,
      clientAppointments.map((a) => a.id)
    );

    const servicesById = new Map(services.map((s) => [s.id, s.name]));
    const countByService = new Map<string, number>();
    for (const item of items) {
      const name = servicesById.get(item.service_id) ?? "—";
      countByService.set(name, (countByService.get(name) ?? 0) + 1);
    }
    const topServices = [...countByService.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      fullName: client.full_name,
      totalSpentCents: client.total_spent_cents,
      firstVisitAt: client.first_visit_at,
      lastVisitAt: client.last_visit_at,
      visitCount: clientAppointments.length,
      topServices,
    };
  },
};

const getAppointmentsForClientSchema = z.object({
  clientId: z.string().uuid(),
  limit: z.number().int().min(1).max(30).optional(),
});

export const getAppointmentsForClientTool: AiToolDefinition<
  z.infer<typeof getAppointmentsForClientSchema>
> = {
  name: "get_appointments_for_client",
  description:
    "Historial de citas de un cliente (fecha, estado, servicios, total cobrado), más recientes primero.",
  inputSchema: {
    type: "object",
    properties: {
      clientId: { type: "string", description: "id del cliente (obtenido con search_clients)" },
      limit: { type: "number", description: "Máximo de citas a devolver (por defecto 10, máx. 30)" },
    },
    required: ["clientId"],
  },
  schema: getAppointmentsForClientSchema,
  async execute(args, ctx: AiToolContext) {
    const [appointments, services] = await Promise.all([
      listAppointments(ctx.supabase, ctx.salonId),
      listServices(ctx.supabase, ctx.salonId),
    ]);
    const clientAppointments = appointments
      .filter((a) => a.client_id === args.clientId)
      .slice(0, args.limit ?? 10);

    const items = await listAppointmentItemsForAppointments(
      ctx.supabase,
      clientAppointments.map((a) => a.id)
    );
    const servicesById = new Map(services.map((s) => [s.id, s.name]));
    const itemsByAppointment = new Map<string, string[]>();
    for (const item of items) {
      const list = itemsByAppointment.get(item.appointment_id) ?? [];
      list.push(servicesById.get(item.service_id) ?? "—");
      itemsByAppointment.set(item.appointment_id, list);
    }

    return {
      appointments: clientAppointments.map((a) => ({
        date: a.appointment_date,
        status: a.status,
        totalCents: a.total_cents,
        services: itemsByAppointment.get(a.id) ?? [],
      })),
    };
  },
};

const getTopClientsSchema = z.object({
  metric: z.enum(["spend", "visits"]),
  limit: z.number().int().min(1).max(20).optional(),
});

export const getTopClientsTool: AiToolDefinition<z.infer<typeof getTopClientsSchema>> = {
  name: "get_top_clients",
  description:
    "Ranking de clientes por gasto total de por vida (metric='spend') o por número de visitas completadas (metric='visits').",
  inputSchema: {
    type: "object",
    properties: {
      metric: { type: "string", enum: ["spend", "visits"], description: "Criterio de ranking" },
      limit: { type: "number", description: "Máximo de clientes a devolver (por defecto 5, máx. 20)" },
    },
    required: ["metric"],
  },
  schema: getTopClientsSchema,
  async execute(args, ctx: AiToolContext) {
    const clients = await listClients(ctx.supabase, ctx.salonId);
    const limit = args.limit ?? 5;

    if (args.metric === "spend") {
      const ranked = [...clients]
        .filter((c) => c.is_active)
        .sort((a, b) => b.total_spent_cents - a.total_spent_cents)
        .slice(0, limit)
        .map((c) => ({ id: c.id, fullName: c.full_name, totalSpentCents: c.total_spent_cents }));
      return { clients: ranked };
    }

    const appointments = await listAppointments(ctx.supabase, ctx.salonId);
    const visitCountByClient = new Map<string, number>();
    for (const a of appointments) {
      if (a.status !== "completed") continue;
      visitCountByClient.set(a.client_id, (visitCountByClient.get(a.client_id) ?? 0) + 1);
    }
    const clientsById = new Map(clients.map((c) => [c.id, c]));
    const ranked = [...visitCountByClient.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([clientId, visitCount]) => ({
        id: clientId,
        fullName: clientsById.get(clientId)?.full_name ?? "—",
        visitCount,
      }));
    return { clients: ranked };
  },
};
