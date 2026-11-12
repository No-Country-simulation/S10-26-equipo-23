import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { ImportacionBody, ImportacionDto } from '@/types/api'
import { busquedasKeys } from './query-keys'

export type ArchivosImportacion = {
  [Campo in keyof ImportacionBody]: File
}

export async function importarBusquedas(
  archivos: ArchivosImportacion,
): Promise<ImportacionDto> {
  const formulario = new FormData()
  for (const [campo, archivo] of Object.entries(archivos)) {
    if (archivo) {
      formulario.append(campo, archivo)
    }
  }
  const { data } = await apiClient.post<ImportacionDto>(
    '/importaciones',
    formulario,
  )
  return data
}

export function useImportarBusquedas() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: busquedasKeys.importar(),
    mutationFn: importarBusquedas,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: busquedasKeys.lista() }),
  })
}
