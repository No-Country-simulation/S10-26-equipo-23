import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { NegocioDetalleDto } from '@/features/negocios/types/api'
import { apiClient } from '@/lib/api-client'
import { notificar } from '@/lib/notificar'
import { negociosKeys } from './query-keys'

export async function redactarCorreo(id: string): Promise<NegocioDetalleDto> {
  const { data } = await apiClient.post<NegocioDetalleDto>(
    `/negocios/${id}/correo`,
  )
  return data
}

export function useRedactarCorreo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: redactarCorreo,
    onSuccess: async (negocio) => {
      notificar.exito('Correo redactado')
      queryClient.setQueryData(negociosKeys.detalle(negocio.id), negocio)
      await queryClient.invalidateQueries({
        queryKey: negociosKeys.deBusqueda(negocio.busqueda.id),
      })
    },
    onError: (error) => notificar.error(error.message),
  })
}
