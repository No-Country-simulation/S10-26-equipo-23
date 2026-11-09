import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { notificar } from '@/lib/notificar'

export async function eliminarBusqueda(id: string): Promise<void> {
  await apiClient.delete(`/busquedas/${id}`)
}

export function useEliminarBusqueda() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: eliminarBusqueda,
    onSuccess: async () => {
      notificar.exito('Búsqueda eliminada')
      await queryClient.invalidateQueries()
    },
    onError: (error) => notificar.error(error.message),
  })
}
