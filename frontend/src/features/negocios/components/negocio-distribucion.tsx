import { Star } from 'lucide-react'
import type { NegocioDetalleDto } from '@/features/negocios/types/api'
import { DetalleCard } from './detalle-card'
import { SinDato } from './sin-dato'

export function NegocioDistribucion({
  negocio,
}: {
  negocio: NegocioDetalleDto
}) {
  const filas = [
    { estrellas: 5, cantidad: negocio.hist_5 },
    { estrellas: 4, cantidad: negocio.hist_4 },
    { estrellas: 3, cantidad: negocio.hist_3 },
    { estrellas: 2, cantidad: negocio.hist_2 },
    { estrellas: 1, cantidad: negocio.hist_1 },
  ]
  const total = filas.reduce((suma, { cantidad }) => suma + (cantidad ?? 0), 0)
  const sinDatos = filas.every(({ cantidad }) => cantidad === null)

  return (
    <DetalleCard titulo="Distribución de estrellas">
      {sinDatos ? (
        <p className="text-muted-foreground">
          Google no mostró la distribución de este negocio.
        </p>
      ) : (
        <ul className="flex flex-1 flex-col justify-between gap-2">
          {filas.map(({ estrellas, cantidad }) => (
            <li key={estrellas} className="flex items-center gap-3">
              <span className="flex w-8 shrink-0 items-center gap-1 tabular-nums">
                {estrellas}
                <Star
                  aria-hidden="true"
                  className="size-4 fill-muted-foreground text-muted-foreground"
                />
                <span className="sr-only">estrellas:</span>
              </span>
              <div
                aria-hidden="true"
                className="h-3 flex-1 overflow-hidden rounded-full bg-secondary"
              >
                <div
                  className="h-full rounded-full bg-muted-foreground"
                  style={{
                    width: `${total === 0 ? 0 : ((cantidad ?? 0) / total) * 100}%`,
                  }}
                />
              </div>
              <span className="w-12 shrink-0 tabular-nums">
                {cantidad === null ? (
                  <SinDato />
                ) : (
                  <>
                    {cantidad}
                    <span className="sr-only"> reseñas</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DetalleCard>
  )
}
