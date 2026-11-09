import { useState } from 'react'
import { CircleAlert, EllipsisVertical, RotateCcw, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { paths } from '@/config/paths'
import { useHayBusquedaEnCurso } from '@/features/busquedas/api/get-busquedas'
import type { BusquedaDto } from '@/types/api'
import { formatearFecha, formatearRubro } from '@/utils/formatos'
import { CancelarBusquedaDialog } from './cancelar-busqueda-dialog'
import { EliminarBusquedaDialog } from './eliminar-busqueda-dialog'
import { EstadoBusquedaBadge } from './estado-busqueda-badge'
import { ProgresoBusqueda } from './progreso-busqueda'

const CIUDADES_VISIBLES = 3

type BusquedaCardProps = {
  busqueda: BusquedaDto
  onVolverAEjecutar: (busqueda: BusquedaDto) => void
}

export function BusquedaCard({
  busqueda,
  onVolverAEjecutar,
}: BusquedaCardProps) {
  const [cancelando, setCancelando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const hayEnCurso = useHayBusquedaEnCurso()
  const fecha = formatearFecha(busqueda.creada_en)
  const ciudades = busqueda.ubicaciones.map(
    ({ ciudad }) => `${ciudad.nombre}, ${ciudad.pais.nombre}`,
  )
  const ocultas = ciudades.length - CIUDADES_VISIBLES

  return (
    <Card size="sm" className="h-full">
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">
            {formatearRubro(busqueda.rubro)}
          </h2>
        </CardTitle>
        <CardDescription className="text-foreground">
          <time dateTime={busqueda.creada_en}>{fecha}</time>
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <EstadoBusquedaBadge estado={busqueda.estado} />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-foreground/15 text-foreground hover:bg-foreground/25"
                aria-label={`Acciones de la búsqueda ${busqueda.rubro} del ${fecha}`}
              >
                <EllipsisVertical aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-max">
              <DropdownMenuItem
                disabled={hayEnCurso}
                onSelect={() => onVolverAEjecutar(busqueda)}
              >
                <RotateCcw aria-hidden="true" />
                Volver a ejecutar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => setEliminando(true)}
              >
                <Trash2 aria-hidden="true" />
                Eliminar búsqueda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2">
        <div>
          <p className="sr-only">Ciudades: {ciudades.join('; ')}</p>
          <ul aria-hidden="true">
            {ciudades.slice(0, CIUDADES_VISIBLES).map((ciudad, indice) => (
              <li key={ciudad}>
                {ciudad}
                {indice === CIUDADES_VISIBLES - 1 && ocultas > 0 && (
                  <span className="text-muted-foreground"> +{ocultas} más</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex items-end gap-2">
          {busqueda.resultados && (
            <p className="flex flex-wrap gap-x-4">
              <span>
                <span className="font-semibold tabular-nums">
                  {busqueda.resultados.cantidad_leads}
                </span>{' '}
                leads
              </span>
              <span>
                <span className="font-semibold tabular-nums">
                  {busqueda.resultados.cantidad_negocios}
                </span>{' '}
                negocios
              </span>
            </p>
          )}

          {busqueda.error && (
            <p className="flex gap-2">
              <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-destructive"
              />
              {busqueda.error}
            </p>
          )}

          {busqueda.estado === 'en_curso' && (
            <ProgresoBusqueda
              busquedaId={busqueda.id}
              className="min-w-0 flex-1"
            />
          )}

          {busqueda.estado === 'en_curso' && (
            <Button
              className="ml-auto bg-destructive text-destructive-foreground hover:bg-destructive/80"
              aria-label={`Cancelar búsqueda ${busqueda.rubro} del ${fecha}`}
              onClick={() => setCancelando(true)}
            >
              Cancelar búsqueda
            </Button>
          )}

          {busqueda.estado === 'completada' && (
            <Button asChild variant="outline" className="ml-auto">
              <Link
                to={paths.detalleBusqueda(busqueda.id)}
                aria-label={`Ver detalle de la búsqueda ${busqueda.rubro} del ${fecha}`}
              >
                Ver detalle
              </Link>
            </Button>
          )}
        </div>
      </CardContent>

      <CancelarBusquedaDialog
        busqueda={busqueda}
        abierto={cancelando}
        onAbiertoChange={setCancelando}
      />
      <EliminarBusquedaDialog
        busqueda={busqueda}
        abierto={eliminando}
        onAbiertoChange={setEliminando}
      />
    </Card>
  )
}
