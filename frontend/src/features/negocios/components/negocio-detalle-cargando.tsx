import { Skeleton } from '@/components/ui/skeleton'
import { useVisibleTrasDemora } from '@/hooks/use-visible-tras-demora'

const FICHAS = [0, 1, 2]

export function NegocioDetalleCargando() {
  const visible = useVisibleTrasDemora()

  return (
    <div role="status" className="flex flex-1 flex-col gap-8">
      <span className="sr-only">Cargando negocio</span>
      {visible && (
        <>
          <div aria-hidden="true" className="flex flex-col gap-4">
            <Skeleton className="h-4 w-36 bg-muted-foreground/20" />
            <Skeleton className="h-8 w-64 bg-muted-foreground/20" />
            <Skeleton className="h-4 w-48 bg-muted-foreground/20" />
            <Skeleton className="h-8 w-44 rounded-full bg-muted-foreground/20" />
          </div>
          <div aria-hidden="true" className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="grid gap-6 lg:grid-cols-2">
                <Skeleton className="min-h-52 rounded-xl bg-muted-foreground/20" />
                <div className="flex flex-col gap-4">
                  {FICHAS.map((ficha) => (
                    <Skeleton
                      key={ficha}
                      className="h-20 rounded-xl bg-muted-foreground/20"
                    />
                  ))}
                </div>
              </div>
              <Skeleton className="h-96 rounded-xl bg-muted-foreground/20" />
            </div>
            <div className="flex flex-col gap-6">
              <Skeleton className="h-96 rounded-xl bg-muted-foreground/20" />
              <Skeleton className="h-40 rounded-xl bg-muted-foreground/20" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
