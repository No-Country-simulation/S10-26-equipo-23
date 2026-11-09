import { CircleAlert, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { MensajePagina } from '@/components/layout/mensaje-pagina'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'

type BusquedaDetalleErrorProps = {
  noEncontrada: boolean
  onReintentar: () => void
}

export function BusquedaDetalleError({
  noEncontrada,
  onReintentar,
}: BusquedaDetalleErrorProps) {
  const irABusquedas = (
    <Button asChild variant={noEncontrada ? 'default' : 'outline'}>
      <Link to={paths.busquedas}>Ir a búsquedas</Link>
    </Button>
  )

  if (noEncontrada) {
    return (
      <>
        <title>Búsqueda no encontrada · RepuSense</title>
        <MensajePagina
          icono={
            <SearchX
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          }
          titulo="Búsqueda no encontrada"
          descripcion="Puede que se haya eliminado."
          acciones={irABusquedas}
        />
      </>
    )
  }

  return (
    <>
      <title>Error al cargar la búsqueda · RepuSense</title>
      <MensajePagina
        icono={
          <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
        }
        titulo="No se pudo cargar la búsqueda"
        descripcion="Revisa tu conexión e inténtalo de nuevo."
        acciones={
          <>
            <Button onClick={onReintentar}>Reintentar</Button>
            {irABusquedas}
          </>
        }
      />
    </>
  )
}
