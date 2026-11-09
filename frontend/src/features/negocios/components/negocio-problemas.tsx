import type { ProblemaDto } from '@/features/negocios/types/api'
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
          Todavía no hay análisis de la IA.
        </p>
      ) : (
        <ul className="flex flex-col gap-6">
          {problemas.map((problema) => (
            <li key={problema.id} className="flex flex-col gap-1">
              <p className="font-medium">
                {problema.problema ?? 'Sin descripción'}
              </p>
              {problema.justificacion && (
                <p className="text-muted-foreground">
                  {problema.justificacion}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </DetalleCard>
  )
}
