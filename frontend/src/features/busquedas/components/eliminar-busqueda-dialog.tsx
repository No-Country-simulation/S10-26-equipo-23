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
import { useEliminarBusqueda } from '@/features/busquedas/api/eliminar-busqueda'
import type { BusquedaDto } from '@/types/api'

type EliminarBusquedaDialogProps = {
  busqueda: BusquedaDto
  abierto: boolean
  onAbiertoChange: (abierto: boolean) => void
}

export function EliminarBusquedaDialog({
  busqueda,
  abierto,
  onAbiertoChange,
}: EliminarBusquedaDialogProps) {
  const eliminar = useEliminarBusqueda()

  function confirmar() {
    eliminar.mutate(busqueda.id)
  }

  return (
    <AlertDialog open={abierto} onOpenChange={onAbiertoChange}>
      <AlertDialogContent className="gap-6 p-6 data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Seguro que quieres eliminar esta búsqueda?
          </AlertDialogTitle>
          <AlertDialogDescription>
            También se eliminarán sus negocios y leads.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="-mx-6 -mb-6 px-6">
          <AlertDialogCancel>Conservar búsqueda</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmar}>
            Eliminar búsqueda
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
