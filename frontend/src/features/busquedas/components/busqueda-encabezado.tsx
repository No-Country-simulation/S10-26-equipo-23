import type { ReactNode } from 'react'
import { ArrowLeft, MapPin, MessageSquare, Star } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { paths } from '@/config/paths'
import type { BusquedaDto } from '@/types/api'
import { FILTROS_POR_DEFECTO } from '@/utils/filtros'
import {
  formatearFecha,
  formatearRating,
  formatearRubro,
} from '@/utils/formatos'

const CLASES_PASTILLA =
  'flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm'
const CLASES_ICONO = 'size-4 shrink-0 text-muted-foreground'

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
          {busqueda.ubicaciones.map(({ id, ciudad }) => (
            <li key={id} className={CLASES_PASTILLA}>
              <MapPin aria-hidden="true" className={CLASES_ICONO} />
              {ciudad.nombre}, {ciudad.pais.nombre}
            </li>
          ))}
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
