import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { BusquedaDto } from '@/types/api'
import { busquedasKeys } from './query-keys'

export async function getBusquedas(): Promise<BusquedaDto[]> {
  const { data } = await apiClient.get<BusquedaDto[]>('/busquedas')
  return data
}

export function useBusquedas() {
  return useQuery({
    queryKey: busquedasKeys.lista(),
    queryFn: getBusquedas,
  })
}

export function useHayBusquedaEnCurso() {
  const { data: busquedas } = useBusquedas()
  return busquedas?.some(({ estado }) => estado === 'en_curso') ?? false
}
