import { ErrorBoundary } from 'react-error-boundary'
import { useParams } from 'react-router'
import {
  esBusquedaNoEncontrada,
  useBusqueda,
} from '@/features/busquedas/api/get-busqueda'
import { BusquedaDetalleCargando } from '@/features/busquedas/components/busqueda-detalle-cargando'
import { BusquedaDetalleError } from '@/features/busquedas/components/busqueda-detalle-error'
import { BusquedaEncabezado } from '@/features/busquedas/components/busqueda-encabezado'
import { BusquedaNoDisponible } from '@/features/busquedas/components/busqueda-no-disponible'
import { BusquedaResumen } from '@/features/busquedas/components/busqueda-resumen'
import { ExportarLeadsButton } from '@/features/negocios/components/exportar-leads-button'
import { NegociosError } from '@/features/negocios/components/negocios-error'
import { NegociosSeccion } from '@/features/negocios/components/negocios-seccion'
import { formatearRubro } from '@/utils/formatos'

export function DetalleBusquedaPage() {
  const { id = '' } = useParams()
  const { data: busqueda, isPending, isError, error, refetch } = useBusqueda(id)

  if (isPending) {
    return (
      <>
        <title>Detalle de búsqueda · RepuSense</title>
        <BusquedaDetalleCargando />
      </>
    )
  }

  if (isError) {
    return (
      <BusquedaDetalleError
        noEncontrada={esBusquedaNoEncontrada(error)}
        onReintentar={() => refetch()}
      />
    )
  }

  if (busqueda.estado !== 'completada') {
    return (
      <BusquedaNoDisponible
        busquedaId={id}
        estado={busqueda.estado}
        error={busqueda.error}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <title>{`${formatearRubro(busqueda.rubro)} · RepuSense`}</title>
      <BusquedaEncabezado
        busqueda={busqueda}
        accion={<ExportarLeadsButton busquedaId={id} rubro={busqueda.rubro} />}
      />
      {busqueda.resultados && (
        <BusquedaResumen resultados={busqueda.resultados} />
      )}
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <NegociosError onReintentar={resetErrorBoundary} />
        )}
      >
        <NegociosSeccion busquedaId={id} />
      </ErrorBoundary>
    </div>
  )
}
