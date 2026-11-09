import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { notificar } from '@/lib/notificar'
import type { BusquedaDto } from '@/types/api'
import { busquedasKeys } from './query-keys'

export async function cancelarBusqueda(id: string): Promise<BusquedaDto> {
  const { data } = await apiClient.post<BusquedaDto>(
    `/busquedas/${id}/cancelar`,
  )
  return data
}

export function useCancelarBusqueda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelarBusqueda,
    onSuccess: async () => {
      notificar.exito('Búsqueda cancelada')
      await queryClient.invalidateQueries({ queryKey: busquedasKeys.all })
    },
    onError: (error) => notificar.error(error.message),
  })
}
