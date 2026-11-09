import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BusquedasError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
      <p>No se pudieron cargar las búsquedas.</p>
      <Button variant="outline" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  )
}
