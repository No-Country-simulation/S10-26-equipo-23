import { Skeleton } from '@/components/ui/skeleton'
import { useVisibleTrasDemora } from '@/hooks/use-visible-tras-demora'

const FICHAS = [0, 1, 2, 3]

export function BusquedaDetalleCargando() {
  const visible = useVisibleTrasDemora()

  return (
    <div role="status" className="flex flex-1 flex-col gap-8">
      <span className="sr-only">Cargando búsqueda</span>
      {visible && (
        <>
          <div aria-hidden="true" className="flex flex-col gap-4">
            <Skeleton className="h-4 w-36 bg-muted-foreground/20" />
            <Skeleton className="h-8 w-48 bg-muted-foreground/20" />
            <Skeleton className="h-4 w-32 bg-muted-foreground/20" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-44 rounded-full bg-muted-foreground/20" />
              <Skeleton className="h-8 w-44 rounded-full bg-muted-foreground/20" />
              <Skeleton className="h-8 w-28 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
          <div
            aria-hidden="true"
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            {FICHAS.map((ficha) => (
              <Skeleton
                key={ficha}
                className="h-20 rounded-xl bg-muted-foreground/20"
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
