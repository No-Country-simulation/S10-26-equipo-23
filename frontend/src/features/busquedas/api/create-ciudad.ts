import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CiudadDto, CreateCiudadBody } from '@/types/api'
import { catalogosKeys } from './query-keys'

export async function createCiudad(
  paisId: string,
  body: CreateCiudadBody,
): Promise<CiudadDto> {
  const { data } = await apiClient.post<CiudadDto>(
    `/paises/${paisId}/ciudades`,
    body,
  )
  return data
}

export function useCreateCiudad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      paisId,
      body,
    }: {
      paisId: string
      body: CreateCiudadBody
    }) => createCiudad(paisId, body),
    onSuccess: (ciudad) =>
      queryClient.invalidateQueries({
        queryKey: catalogosKeys.ciudadesDePais(ciudad.pais_id),
      }),
  })
}
