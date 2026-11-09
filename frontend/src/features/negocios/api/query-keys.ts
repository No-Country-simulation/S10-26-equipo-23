export const negociosKeys = {
  all: ['negocios'] as const,
  deBusqueda: (busquedaId: string) =>
    [...negociosKeys.all, 'busqueda', busquedaId] as const,
  detalle: (id: string) => [...negociosKeys.all, 'detalle', id] as const,
}
