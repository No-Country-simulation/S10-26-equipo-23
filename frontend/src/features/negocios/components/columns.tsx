import {
  createColumnHelper,
  sortFn_basic,
  type Row,
} from '@tanstack/react-table'
import { Link } from 'react-router'
import { paths } from '@/config/paths'
import type {
  NegocioFilaDto,
  PrioridadLead,
  TendenciaLead as Tendencia,
} from '@/features/negocios/types/api'
import { formatearPorcentaje, formatearRating } from '@/utils/formatos'
import { NegocioContactos } from './negocio-contactos'
import { PrioridadLeadBadge } from './prioridad-lead-badge'
import { SinDato } from './sin-dato'
import { tablaFeatures } from './tabla-features'
import { TendenciaLead } from './tendencia-lead'

const ayudante = createColumnHelper<typeof tablaFeatures, NegocioFilaDto>()

const ORDEN_PRIORIDAD: Record<PrioridadLead, number> = { Alta: 0, Media: 1 }

const ORDEN_TENDENCIA: Record<Tendencia, number> = {
  empeora: 0,
  estable: 1,
  mejora: 2,
  'sin historial': 3,
}

type FilaTabla = Row<typeof tablaFeatures, NegocioFilaDto>

function ordenarPorTexto(leer: (negocio: NegocioFilaDto) => string) {
  return (a: FilaTabla, b: FilaTabla) =>
    leer(a.original).localeCompare(leer(b.original), 'es')
}

function nombreDeCiudad({ ciudad }: NegocioFilaDto) {
  return `${ciudad.nombre}, ${ciudad.pais.nombre}`
}

const columnaNegocio = ayudante.accessor(({ nombre }) => nombre, {
  id: 'nombre',
  header: 'Negocio',
  sortFn: ordenarPorTexto(({ nombre }) => nombre),
  cell: ({ row }) => (
    <div className="max-w-56 whitespace-normal">
      <Link
        to={paths.detalleNegocio(row.original.id)}
        className="font-medium underline underline-offset-4"
      >
        {row.original.nombre}
      </Link>
    </div>
  ),
})

const columnaCiudad = ayudante.accessor(nombreDeCiudad, {
  id: 'ciudad',
  header: 'Ciudad',
  sortFn: ordenarPorTexto(nombreDeCiudad),
  cell: ({ row }) => (
    <div className="max-w-32 whitespace-normal">
      {nombreDeCiudad(row.original)}
    </div>
  ),
})

const columnaRating = ayudante.accessor(({ rating }) => rating ?? undefined, {
  id: 'rating',
  header: 'Calificación',
  sortFn: sortFn_basic,
  sortUndefined: 'last',
  cell: ({ row }) =>
    row.original.rating === null ? (
      <SinDato />
    ) : (
      formatearRating(row.original.rating)
    ),
})

const columnaResenas = ayudante.accessor(
  ({ n_resenas }) => n_resenas ?? undefined,
  {
    id: 'n_resenas',
    header: 'Reseñas',
    sortFn: sortFn_basic,
    sortUndefined: 'last',
    cell: ({ row }) => row.original.n_resenas ?? <SinDato />,
  },
)

const columnaNegativas = ayudante.accessor(
  ({ pct_negativas }) => pct_negativas ?? undefined,
  {
    id: 'pct_negativas',
    header: '% negativas',
    sortFn: sortFn_basic,
    sortUndefined: 'last',
    cell: ({ row }) =>
      row.original.pct_negativas === null ? (
        <SinDato />
      ) : (
        formatearPorcentaje(row.original.pct_negativas)
      ),
  },
)

const columnaPrioridad = ayudante.accessor(
  ({ lead }) => (lead?.prioridad ? ORDEN_PRIORIDAD[lead.prioridad] : undefined),
  {
    id: 'prioridad',
    header: 'Prioridad',
    sortFn: sortFn_basic,
    sortUndefined: 'last',
    cell: ({ row }) => (
      <PrioridadLeadBadge prioridad={row.original.lead?.prioridad ?? null} />
    ),
  },
)

const columnaTendencia = ayudante.accessor(
  ({ lead }) => (lead?.tendencia ? ORDEN_TENDENCIA[lead.tendencia] : undefined),
  {
    id: 'tendencia',
    header: 'Tendencia',
    sortFn: sortFn_basic,
    sortUndefined: 'last',
    cell: ({ row }) => (
      <TendenciaLead tendencia={row.original.lead?.tendencia ?? null} />
    ),
  },
)

const columnaContacto = ayudante.accessor('contactos', {
  header: 'Contacto',
  enableSorting: false,
  cell: ({ row }) => <NegocioContactos contactos={row.original.contactos} />,
})

export const columnas = ayudante.columns([
  columnaNegocio,
  columnaCiudad,
  columnaRating,
  columnaResenas,
  columnaNegativas,
  columnaPrioridad,
  columnaTendencia,
  columnaContacto,
])

export const COLUMNAS_NUMERICAS = new Set([
  'rating',
  'n_resenas',
  'pct_negativas',
])

export const COLUMNAS_ANGOSTAS = new Set(['prioridad'])
