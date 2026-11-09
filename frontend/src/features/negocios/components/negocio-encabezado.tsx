import { ArrowLeft, ExternalLink, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'
import type { NegocioDetalleDto } from '@/features/negocios/types/api'
import { formatearRubro } from '@/utils/formatos'

export function NegocioEncabezado({ negocio }: { negocio: NegocioDetalleDto }) {
  const { ciudad } = negocio

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={paths.detalleBusqueda(negocio.busqueda.id)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a {formatearRubro(negocio.busqueda.rubro)}
      </Link>
      <PageHeader
        titulo={negocio.nombre}
        descripcion={negocio.direccion ?? undefined}
        accion={
          negocio.url_google_maps && (
            <Button asChild>
              <a
                href={negocio.url_google_maps}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink aria-hidden="true" />
                Abrir en Google Maps
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            </Button>
          )
        }
      />
      <p className="flex w-fit items-center gap-1 rounded-full border bg-card px-3 py-1 text-sm">
        <MapPin
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
        {ciudad.nombre}, {ciudad.pais.nombre}
      </p>
    </div>
  )
}
