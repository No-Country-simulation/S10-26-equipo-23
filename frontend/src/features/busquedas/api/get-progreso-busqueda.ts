import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RUTA_API } from '@/lib/api-client'
import type {
  BusquedaDto,
  ProgresoBusquedaEventoDto,
  ProgresoDto,
} from '@/types/api'
import { busquedasKeys } from './query-keys'

export function rutaProgresoBusqueda(id: string) {
  return `${RUTA_API}/busquedas/${id}/progreso`
}

export function useProgresoBusqueda(id: string): ProgresoDto | null {
  const queryClient = useQueryClient()
  const [progreso, setProgreso] = useState<ProgresoDto | null>(null)

  useEffect(() => {
    const fuente = new EventSource(rutaProgresoBusqueda(id))
    fuente.onmessage = (mensaje: MessageEvent<string>) => {
      const evento = JSON.parse(mensaje.data) as ProgresoBusquedaEventoDto
      setProgreso(evento.progreso)
      if (evento.estado === 'en_curso') {
        return
      }
      fuente.close()
      queryClient.setQueryData<BusquedaDto>(
        busquedasKeys.detalle(id),
        (busqueda) => busqueda && { ...busqueda, estado: evento.estado },
      )
      void queryClient.invalidateQueries({ queryKey: busquedasKeys.all })
    }
    return () => fuente.close()
  }, [id, queryClient])

  return progreso
}
