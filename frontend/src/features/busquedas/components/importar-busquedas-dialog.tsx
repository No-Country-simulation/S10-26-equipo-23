import { useIsMutating } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { busquedasKeys } from '@/features/busquedas/api/query-keys'
import { ImportarBusquedasForm } from './importar-busquedas-form'

type ImportarBusquedasDialogProps = {
  abierto: boolean
  onAbiertoChange: (abierto: boolean) => void
}

export function ImportarBusquedasDialog({
  abierto,
  onAbiertoChange,
}: ImportarBusquedasDialogProps) {
  const importando =
    useIsMutating({ mutationKey: busquedasKeys.importar() }) > 0

  return (
    <Dialog
      open={abierto}
      onOpenChange={(abrir) => {
        if (!importando) onAbiertoChange(abrir)
      }}
    >
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Sube los 4 CSV del scraper para crear sus búsquedas. Antes de
            guardarlas, Gemini detecta los problemas de cada lead y redacta su
            correo de primer contacto
          </DialogDescription>
        </DialogHeader>
        <ImportarBusquedasForm onImportada={() => onAbiertoChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
