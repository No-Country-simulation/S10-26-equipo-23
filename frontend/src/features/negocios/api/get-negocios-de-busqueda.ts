import { useQuery } from '@tanstack/react-query'
import type { NegocioFilaDto } from '@/features/negocios/types/api'
import { apiClient } from '@/lib/api-client'
import { negociosKeys } from './query-keys'

export async function getNegociosDeBusqueda(
  busquedaId: string,
): Promise<NegocioFilaDto[]> {
  const { data } = await apiClient.get<NegocioFilaDto[]>(
    `/busquedas/${busquedaId}/negocios`,
  )
  return data
}

export function useNegociosDeBusqueda(busquedaId: string) {
  return useQuery({
    queryKey: negociosKeys.deBusqueda(busquedaId),
    queryFn: () => getNegociosDeBusqueda(busquedaId),
  })
}
