import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BusquedasVacio({ onNueva }: { onNueva: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <Search aria-hidden="true" className="size-5 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Todavía no hay búsquedas</h2>
        <p className="text-sm text-muted-foreground">
          Aquí aparecerán las búsquedas que realices
        </p>
      </div>
      <Button onClick={onNueva}>Nueva búsqueda</Button>
    </div>
  )
}
