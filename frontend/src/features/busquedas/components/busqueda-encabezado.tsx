import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ChevronDown,
  MapPin,
  MessageSquare,
  Star,
} from 'lucide-react'
import { cn } from 'cn'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { paths } from '@/config/paths'
import type { BusquedaDto, PaisDto, UbicacionDto } from '@/types/api'
import { FILTROS_POR_DEFECTO } from '@/utils/filtros'
import {
  formatearFecha,
  formatearRating,
  formatearRubro,
} from '@/utils/formatos'

const CLASES_PASTILLA =
  'flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm'
const CLASES_ICONO = 'size-4 shrink-0 text-muted-foreground'

type CiudadesDePais = {
  pais: PaisDto
  ciudades: string[]
}

function agruparPorPais(ubicaciones: UbicacionDto[]) {
  const grupos = new Map<string, CiudadesDePais>()
  for (const { ciudad } of ubicaciones) {
    const grupo = grupos.get(ciudad.pais.id) ?? {
      pais: ciudad.pais,
      ciudades: [],
    }
    grupo.ciudades.push(ciudad.nombre)
    grupos.set(ciudad.pais.id, grupo)
  }
  return [...grupos.values()]
}

type BusquedaEncabezadoProps = {
  busqueda: BusquedaDto
  accion: ReactNode
}

export function BusquedaEncabezado({
  busqueda,
  accion,
}: BusquedaEncabezadoProps) {
  const ratingMinimo =
    busqueda.rating_minimo ?? FILTROS_POR_DEFECTO.rating_minimo
  const ratingMaximo =
    busqueda.rating_maximo ?? FILTROS_POR_DEFECTO.rating_maximo
  const minResenas = busqueda.min_resenas ?? FILTROS_POR_DEFECTO.min_resenas

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={paths.busquedas}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a búsquedas
      </Link>
      <PageHeader
        titulo={formatearRubro(busqueda.rubro)}
        descripcion={
          <time dateTime={busqueda.creada_en}>
            {formatearFecha(busqueda.creada_en)}
          </time>
        }
        accion={accion}
      />
      <div className="flex flex-col gap-2">
        <ul
          aria-label="Ciudades de la búsqueda"
          className="flex flex-wrap gap-2"
        >
          {agruparPorPais(busqueda.ubicaciones).map(({ pais, ciudades }) =>
            ciudades.length === 1 ? (
              <li key={pais.id} className={CLASES_PASTILLA}>
                <MapPin aria-hidden="true" className={CLASES_ICONO} />
                {ciudades[0]}, {pais.nombre}
              </li>
            ) : (
              <li key={pais.id}>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        CLASES_PASTILLA,
                        'cursor-pointer transition-colors hover:bg-accent data-[state=open]:border-primary data-[state=open]:bg-accent motion-reduce:transition-none',
                      )}
                    >
                      <MapPin aria-hidden="true" className={CLASES_ICONO} />
                      {pais.nombre}
                      <span className="text-muted-foreground">
                        ·{' '}
                        <span className="tabular-nums">{ciudades.length}</span>{' '}
                        ciudades
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={CLASES_ICONO}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80 cursor-default">
                    <PopoverHeader className="flex-row items-baseline justify-between gap-2 border-b pb-2">
                      <PopoverTitle>{pais.nombre}</PopoverTitle>
                      <span className="text-xs text-muted-foreground">
                        <span className="tabular-nums">{ciudades.length}</span>{' '}
                        ciudades
                      </span>
                    </PopoverHeader>
                    <ul
                      aria-label={`Ciudades de ${pais.nombre}`}
                      className="grid max-h-72 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto"
                    >
                      {ciudades.map((ciudad) => (
                        <li key={ciudad} className="flex items-start gap-1.5">
                          <MapPin
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                          />
                          {ciudad}
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              </li>
            ),
          )}
        </ul>
        <ul
          aria-label="Filtros de la búsqueda"
          className="flex flex-wrap gap-2"
        >
          <li className={CLASES_PASTILLA}>
            <Star aria-hidden="true" className={CLASES_ICONO} />
            <span className="sr-only">Calificación</span>
            {formatearRating(ratingMinimo)}–{formatearRating(ratingMaximo)}
          </li>
          <li className={CLASES_PASTILLA}>
            <MessageSquare aria-hidden="true" className={CLASES_ICONO} />
            Más de {minResenas} reseñas
          </li>
        </ul>
      </div>
    </div>
  )
}
