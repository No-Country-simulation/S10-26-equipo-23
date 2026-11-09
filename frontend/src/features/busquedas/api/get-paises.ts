import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { PaisDto } from '@/types/api'
import { catalogosKeys } from './query-keys'

export async function getPaises(): Promise<PaisDto[]> {
  const { data } = await apiClient.get<PaisDto[]>('/paises')
  return data
}

export function usePaises() {
  return useQuery({
    queryKey: catalogosKeys.paises,
    queryFn: getPaises,
    staleTime: Infinity,
  })
}
