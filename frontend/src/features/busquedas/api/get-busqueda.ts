import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import type { BusquedaDto } from '@/types/api'
import { busquedasKeys } from './query-keys'

const ESTADOS_NO_ENCONTRADA = [400, 404]

export function esBusquedaNoEncontrada(error: unknown) {
  return (
    error instanceof ApiError && ESTADOS_NO_ENCONTRADA.includes(error.status)
  )
}

export async function getBusqueda(id: string): Promise<BusquedaDto> {
  const { data } = await apiClient.get<BusquedaDto>(`/busquedas/${id}`)
  return data
}

export function useBusqueda(id: string) {
  return useQuery({
    queryKey: busquedasKeys.detalle(id),
    queryFn: () => getBusqueda(id),
    retry: (intentos, error) => !esBusquedaNoEncontrada(error) && intentos < 1,
  })
}
