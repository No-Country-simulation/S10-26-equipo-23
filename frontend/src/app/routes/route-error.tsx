import { CircleAlert } from 'lucide-react'
import { MensajePagina } from '@/components/layout/mensaje-pagina'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'

export function RouteErrorPage() {
  return (
    <>
      <title>Error · RepuSense</title>
      <MensajePagina
        icono={
          <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
        }
        titulo="Algo salió mal"
        descripcion="Ocurrió un error inesperado al mostrar esta página."
        acciones={
          <>
            <Button variant="outline" asChild>
              <a href={paths.busquedas}>Ir a búsquedas</a>
            </Button>
            <Button onClick={() => window.location.reload()}>
              Recargar la página
            </Button>
          </>
        }
      />
    </>
  )
}
