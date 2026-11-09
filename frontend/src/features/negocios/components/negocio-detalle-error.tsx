import { CircleAlert, SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { MensajePagina } from '@/components/layout/mensaje-pagina'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'

type NegocioDetalleErrorProps = {
  noEncontrado: boolean
  onReintentar: () => void
}

export function NegocioDetalleError({
  noEncontrado,
  onReintentar,
}: NegocioDetalleErrorProps) {
  const irABusquedas = (
    <Button asChild variant={noEncontrado ? 'default' : 'outline'}>
      <Link to={paths.busquedas}>Ir a búsquedas</Link>
    </Button>
  )

  if (noEncontrado) {
    return (
      <>
        <title>Negocio no encontrado · RepuSense</title>
        <MensajePagina
          icono={
            <SearchX
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          }
          titulo="Negocio no encontrado"
          descripcion="Puede que se haya eliminado su búsqueda."
          acciones={irABusquedas}
        />
      </>
    )
  }

  return (
    <>
      <title>Error al cargar el negocio · RepuSense</title>
      <MensajePagina
        icono={
          <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
        }
        titulo="No se pudo cargar el negocio"
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
