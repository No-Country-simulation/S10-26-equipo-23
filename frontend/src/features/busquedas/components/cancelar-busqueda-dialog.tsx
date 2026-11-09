import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCancelarBusqueda } from '@/features/busquedas/api/cancelar-busqueda'
import type { BusquedaDto } from '@/types/api'

type CancelarBusquedaDialogProps = {
  busqueda: BusquedaDto
  abierto: boolean
  onAbiertoChange: (abierto: boolean) => void
}

export function CancelarBusquedaDialog({
  busqueda,
  abierto,
  onAbiertoChange,
}: CancelarBusquedaDialogProps) {
  const cancelar = useCancelarBusqueda()

  function confirmar() {
    cancelar.mutate(busqueda.id)
  }

  return (
    <AlertDialog open={abierto} onOpenChange={onAbiertoChange}>
      <AlertDialogContent className="gap-6 p-6 data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Seguro que quieres cancelar esta búsqueda?
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            Elige si cancelarla o seguir con ella.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-6 -mb-6 px-6">
          <AlertDialogCancel>Seguir con la búsqueda</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmar}>
            Cancelar búsqueda
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
