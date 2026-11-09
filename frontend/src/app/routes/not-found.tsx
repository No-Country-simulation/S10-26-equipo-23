import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { MensajePagina } from '@/components/layout/mensaje-pagina'
import { Button } from '@/components/ui/button'
import { paths } from '@/config/paths'

export function NotFoundPage() {
  return (
    <>
      <title>Página no encontrada · RepuSense</title>
      <MensajePagina
        icono={
          <SearchX
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
        }
        titulo="Página no encontrada"
        descripcion="La dirección no existe o cambió."
        acciones={
          <Button asChild>
            <Link to={paths.busquedas}>Ir a búsquedas</Link>
          </Button>
        }
      />
    </>
  )
}
