import type { NegocioDetalleDto } from '@/features/negocios/types/api'
import { formatearPorcentaje, formatearRating } from '@/utils/formatos'
import { SinDato } from './sin-dato'

export function NegocioMetricas({ negocio }: { negocio: NegocioDetalleDto }) {
  const datos = [
    {
      nombre: 'Calificación',
      valor: negocio.rating === null ? null : formatearRating(negocio.rating),
    },
    { nombre: 'Reseñas', valor: negocio.n_resenas },
    {
      nombre: 'Reseñas negativas',
      valor:
        negocio.pct_negativas === null
          ? null
          : formatearPorcentaje(negocio.pct_negativas),
    },
  ]

  return (
    <dl className="flex flex-col gap-4">
      {datos.map(({ nombre, valor }) => (
        <div
          key={nombre}
          className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3"
        >
          <dt className="text-sm text-muted-foreground">{nombre}</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {valor ?? <SinDato />}
          </dd>
        </div>
      ))}
    </dl>
  )
}
