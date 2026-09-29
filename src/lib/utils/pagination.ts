"use client";

import { useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 20;

// Paginación del lado del cliente (CLAUDE.md, bloque "Paginación"): el
// array completo ya llega cargado del servidor (KPIs, gráficos y export CSV
// siguen usando ese array completo, sin recortar) -- esto solo decide qué
// porción se renderiza en la tabla visible. Volumen de datos esperado de un
// salón (pagos, cuadres, gastos...) no justifica reescribir cada consulta a
// Supabase con range()/?page= en la URL.
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // Si la lista se encoge (se borra un registro, cambia un filtro) y la
  // página recordada queda fuera de rango, se recorta a la última válida en
  // vez de mostrar una página vacía.
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );

  return { page: safePage, setPage, totalPages, pageItems, totalItems: items.length };
}
