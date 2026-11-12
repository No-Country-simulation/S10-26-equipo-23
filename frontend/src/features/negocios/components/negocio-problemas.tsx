import type { ProblemaDto } from '@/features/negocios/types/api'
import { formatearProblema } from '@/features/negocios/utils/formatear-problema'
import { DetalleCard } from './detalle-card'

export function NegocioProblemas({ problemas }: { problemas: ProblemaDto[] }) {
  return (
    <DetalleCard
      titulo={
        problemas.length > 1 ? 'Problemas detectados' : 'Problema detectado'
      }
    >
      {problemas.length === 0 ? (
        <p className="text-muted-foreground">
          No hay reseñas negativas con texto para analizar.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {problemas.map((problema) => (
            <li key={problema.id} className="flex items-baseline gap-2">
              <span className="text-muted-foreground tabular-nums">
                {problema.orden}.
              </span>
              <span className="font-medium">
                {problema.problema === null
                  ? 'Sin descripción'
                  : formatearProblema(problema.problema)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </DetalleCard>
  )
}
