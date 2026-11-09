import { Skeleton } from '@/components/ui/skeleton'
import { useVisibleTrasDemora } from '@/hooks/use-visible-tras-demora'

const FILAS = [0, 1, 2, 3, 4, 5, 6, 7]

export function NegociosCargando() {
  const visible = useVisibleTrasDemora()

  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Cargando negocios</span>
      {visible && (
        <>
          <Skeleton
            aria-hidden="true"
            className="h-8 w-64 bg-muted-foreground/20"
          />
          <Skeleton
            aria-hidden="true"
            className="h-14 w-full bg-muted-foreground/20"
          />
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-xl border bg-card p-4"
          >
            {FILAS.map((fila) => (
              <Skeleton key={fila} className="h-8 bg-muted-foreground/20" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
