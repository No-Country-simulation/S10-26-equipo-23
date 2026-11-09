import { Info } from 'lucide-react'
import { Link } from 'react-router'
import { MensajePagina } from '@/components/layout/mensaje-pagina'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import type { BusquedaDto, EstadoBusqueda } from '@/types/api'
import { ProgresoBusqueda } from './progreso-busqueda'

const MENSAJES: Record<
  Exclude<EstadoBusqueda, 'completada'>,
  { titulo: string; descripcion: string }
> = {
  en_curso: {
    titulo: 'Esta búsqueda sigue en curso',
    descripcion: 'Podrás ver sus resultados cuando termine.',
  },
  fallida: {
    titulo: 'Esta búsqueda falló',
    descripcion: 'No guardó resultados.',
  },
  cancelada: {
    titulo: 'Esta búsqueda se canceló',
    descripcion: 'No guardó resultados.',
  },
}

type BusquedaNoDisponibleProps = {
  busquedaId: string
  estado: Exclude<EstadoBusqueda, 'completada'>
  error: BusquedaDto['error']
}

export function BusquedaNoDisponible({
  busquedaId,
  estado,
  error,
}: BusquedaNoDisponibleProps) {
  const { titulo, descripcion } = MENSAJES[estado]

  return (
    <>
      <title>Búsqueda sin resultados · RepuSense</title>
      <MensajePagina
        icono={
          <Info aria-hidden="true" className="size-5 text-muted-foreground" />
        }
        titulo={titulo}
        descripcion={error ?? descripcion}
        contenido={
          estado === 'en_curso' && (
            <ProgresoBusqueda
              busquedaId={busquedaId}
              className="w-full max-w-80"
            />
          )
        }
        acciones={
          <Button asChild>
            <Link to={paths.busquedas}>Ir a búsquedas</Link>
          </Button>
        }
      />
    </>
  )
}
