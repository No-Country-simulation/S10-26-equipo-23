import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CiudadElegida } from './nueva-busqueda-form.schema'

type CiudadesElegidasProps = {
  ciudades: CiudadElegida[]
  onQuitar: (id: string) => void
}

export function CiudadesElegidas({
  ciudades,
  onQuitar,
}: CiudadesElegidasProps) {
  if (ciudades.length === 0) return null

  return (
    <ul aria-label="Ciudades elegidas" className="flex flex-wrap gap-2">
      {ciudades.map((ciudad) => (
        <li
          key={ciudad.id}
          className="flex items-center gap-1 rounded-full border border-border bg-secondary py-0.5 pr-1 pl-3 text-sm text-secondary-foreground"
        >
          {ciudad.nombre}, {ciudad.pais_nombre}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-full"
            aria-label={`Quitar ${ciudad.nombre}, ${ciudad.pais_nombre}`}
            onClick={() => onQuitar(ciudad.id)}
          >
            <X aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
