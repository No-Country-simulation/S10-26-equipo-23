import { useParams } from 'react-router'
import {
  esNegocioNoEncontrado,
  useNegocio,
} from '@/features/negocios/api/get-negocio'
import { NegocioDetalleCargando } from '@/features/negocios/components/negocio-detalle-cargando'
import { NegocioDetalleError } from '@/features/negocios/components/negocio-detalle-error'
import { NegocioDistribucion } from '@/features/negocios/components/negocio-distribucion'
import { NegocioEncabezado } from '@/features/negocios/components/negocio-encabezado'
import { NegocioLead } from '@/features/negocios/components/negocio-lead'
import { NegocioMetricas } from '@/features/negocios/components/negocio-metricas'
import { NegocioProblemas } from '@/features/negocios/components/negocio-problemas'
import { NegocioResenas } from '@/features/negocios/components/negocio-resenas'

export function DetalleNegocioPage() {
  const { id = '' } = useParams()
  const { data: negocio, isPending, isError, error, refetch } = useNegocio(id)

  if (isPending) {
    return (
      <>
        <title>Detalle de negocio · RepuSense</title>
        <NegocioDetalleCargando />
      </>
    )
  }

  if (isError) {
    return (
      <NegocioDetalleError
        noEncontrado={esNegocioNoEncontrado(error)}
        onReintentar={() => refetch()}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <title>{`${negocio.nombre} · RepuSense`}</title>
      <NegocioEncabezado negocio={negocio} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="grid gap-6 lg:grid-cols-2">
            <NegocioDistribucion negocio={negocio} />
            <NegocioMetricas negocio={negocio} />
          </div>
          <NegocioResenas resenas={negocio.resenas} />
        </div>
        <div className="flex flex-col gap-6">
          <NegocioLead lead={negocio.lead} contactos={negocio.contactos} />
          {negocio.lead && (
            <NegocioProblemas problemas={negocio.lead.problemas} />
          )}
        </div>
      </div>
    </div>
  )
}
