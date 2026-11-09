import { useQuery } from '@tanstack/react-query'
import type { NegocioDetalleDto } from '@/features/negocios/types/api'
import { apiClient } from '@/lib/api-client'
import { ApiError } from '@/lib/api-error'
import { negociosKeys } from './query-keys'

const ESTADOS_NO_ENCONTRADO = [400, 404]

export function esNegocioNoEncontrado(error: unknown) {
  return (
    error instanceof ApiError && ESTADOS_NO_ENCONTRADO.includes(error.status)
  )
}

export async function getNegocio(id: string): Promise<NegocioDetalleDto> {
  const { data } = await apiClient.get<NegocioDetalleDto>(`/negocios/${id}`)
  return data
}

export function useNegocio(id: string) {
  return useQuery({
    queryKey: negociosKeys.detalle(id),
    queryFn: () => getNegocio(id),
    retry: (intentos, error) => !esNegocioNoEncontrado(error) && intentos < 1,
  })
}
