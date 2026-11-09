import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import type { ContactoDto, LeadDetalleDto } from '@/features/negocios/types/api'
import { formatearPorcentaje } from '@/utils/formatos'
import { ContactoValor } from './contacto-valor'
import { DetalleCard } from './detalle-card'
import { PrioridadLeadBadge } from './prioridad-lead-badge'
import { SinDato } from './sin-dato'
import { TendenciaLead } from './tendencia-lead'

const formatoVariacion = new Intl.NumberFormat('es', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
})

function DatosLead({ lead }: { lead: LeadDetalleDto }) {
  const datos: { nombre: string; valor: ReactNode }[] = [
    {
      nombre: 'Prioridad',
      valor: <PrioridadLeadBadge prioridad={lead.prioridad} />,
    },
    {
      nombre: 'Frente a su competencia',
      valor:
        lead.percentil === null ? (
          <SinDato />
        ) : (
          `El ${formatearPorcentaje(1 - lead.percentil)} tiene mejor calificación`
        ),
    },
    {
      nombre: 'Tendencia',
      valor: (
        <span className="flex flex-wrap items-center gap-2">
          <TendenciaLead tendencia={lead.tendencia} />
          {lead.variacion_rating !== null && (
            <span className="text-muted-foreground tabular-nums">
              {formatoVariacion.format(lead.variacion_rating)}
              <span className="sr-only"> estrellas</span>
            </span>
          )}
        </span>
      ),
    },
  ]

  return (
    <dl className="flex flex-col gap-3">
      {datos.map(({ nombre, valor }) => (
        <div key={nombre} className="flex flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{nombre}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

type NegocioLeadProps = {
  lead: LeadDetalleDto | null
  contactos: ContactoDto[]
}

export function NegocioLead({ lead, contactos }: NegocioLeadProps) {
  return (
    <DetalleCard titulo="Lead">
      {lead ? (
        <DatosLead lead={lead} />
      ) : (
        <p className="text-muted-foreground">
          No es lead: no cumple los filtros de la búsqueda.
        </p>
      )}
      <Separator className="my-4 bg-muted-foreground/40" />
      <div className="flex flex-col gap-1">
        <h3 className="text-xs text-muted-foreground">Contactos</h3>
        {contactos.length === 0 ? (
          <p className="text-muted-foreground">
            No se encontraron contactos de este negocio.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 wrap-anywhere">
            {contactos.map(({ id, valor }) => (
              <li key={id}>
                <ContactoValor valor={valor} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetalleCard>
  )
}
