import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { CiudadDto } from '@/types/api'
import { catalogosKeys } from './query-keys'

export async function getCiudades(
  paisId: string,
  nombre: string,
): Promise<CiudadDto[]> {
  const { data } = await apiClient.get<CiudadDto[]>(
    `/paises/${paisId}/ciudades`,
    { params: nombre ? { nombre } : undefined },
  )
  return data
}

export function useCiudades(paisId: string | null, nombre: string) {
  const texto = nombre.trim()
  return useQuery({
    queryKey: catalogosKeys.ciudades(paisId ?? '', texto),
    queryFn: () => getCiudades(paisId ?? '', texto),
    enabled: paisId !== null,
    placeholderData: (anterior, consultaAnterior) =>
      consultaAnterior?.queryKey[1] === paisId ? anterior : undefined,
  })
}
