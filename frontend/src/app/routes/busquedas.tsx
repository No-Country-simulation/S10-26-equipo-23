import { useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { ErrorBoundary } from 'react-error-boundary'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useHayBusquedaEnCurso } from '@/features/busquedas/api/get-busquedas'
import { BusquedasError } from '@/features/busquedas/components/busquedas-error'
import { BusquedasGrid } from '@/features/busquedas/components/busquedas-grid'
import { ImportarBusquedasDialog } from '@/features/busquedas/components/importar-busquedas-dialog'
import { NuevaBusquedaDialog } from '@/features/busquedas/components/nueva-busqueda-dialog'
import type { BusquedaDto } from '@/types/api'

export function BusquedasPage() {
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [importarAbierto, setImportarAbierto] = useState(false)
  const [base, setBase] = useState<BusquedaDto | null>(null)
  const [, setSearchParams] = useSearchParams()
  const hayEnCurso = useHayBusquedaEnCurso()

  function abrirDialogo(busquedaBase: BusquedaDto | null) {
    setBase(busquedaBase)
    setDialogoAbierto(true)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <title>Búsquedas · RepuSense</title>
      <PageHeader
        titulo="Búsquedas"
        accion={
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {hayEnCurso && 'Hay una búsqueda en curso'}
            </p>
            <Button
              variant="outline"
              disabled={hayEnCurso}
              onClick={() => setImportarAbierto(true)}
            >
              <Upload aria-hidden="true" />
              Importar CSV
            </Button>
            <Button disabled={hayEnCurso} onClick={() => abrirDialogo(null)}>
              <Plus aria-hidden="true" />
              Nueva búsqueda
            </Button>
          </div>
        }
      />
      <ErrorBoundary
        fallbackRender={({ resetErrorBoundary }) => (
          <BusquedasError onReintentar={resetErrorBoundary} />
        )}
      >
        <BusquedasGrid
          onNueva={() => abrirDialogo(null)}
          onVolverAEjecutar={abrirDialogo}
        />
      </ErrorBoundary>

      {/* Overlay de Nueva Búsqueda */}
      <NuevaBusquedaDialog
        abierto={dialogoAbierto}
        base={base}
        onAbiertoChange={setDialogoAbierto}
        onCreada={() => setSearchParams({}, { replace: true })}
      />
      <ImportarBusquedasDialog
        abierto={importarAbierto}
        onAbiertoChange={setImportarAbierto}
      />
    </div>
  )
}
