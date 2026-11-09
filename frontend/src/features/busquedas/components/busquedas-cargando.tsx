import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CLASES_CUADRICULA,
  FICHAS_POR_PAGINA,
} from '@/features/busquedas/utils/paginacion'
import { useVisibleTrasDemora } from '@/hooks/use-visible-tras-demora'

const TARJETAS = Array.from({ length: FICHAS_POR_PAGINA }, (_, i) => i)

export function BusquedasCargando() {
  const visible = useVisibleTrasDemora()

  return (
    <div role="status" className={CLASES_CUADRICULA}>
      <span className="sr-only">Cargando búsquedas</span>
      {visible &&
        TARJETAS.map((tarjeta) => (
          <Card key={tarjeta} size="sm" aria-hidden="true">
            <CardHeader>
              <Skeleton className="h-5 w-32 bg-muted-foreground/20" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-48 bg-muted-foreground/20" />
              <Skeleton className="h-4 w-36 bg-muted-foreground/20" />
              <Skeleton className="h-4 w-56 bg-muted-foreground/20" />
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
