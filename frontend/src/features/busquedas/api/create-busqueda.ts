import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { BusquedaDto, CreateBusquedaBody } from '@/types/api'
import { busquedasKeys } from './query-keys'

export async function createBusqueda(
  body: CreateBusquedaBody,
): Promise<BusquedaDto> {
  const { data } = await apiClient.post<BusquedaDto>('/busquedas', body)
  return data
}

export function useCreateBusqueda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: busquedasKeys.crear(),
    mutationFn: createBusqueda,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: busquedasKeys.lista() }),
  })
}
