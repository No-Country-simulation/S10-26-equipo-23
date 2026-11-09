import type { ReactNode } from 'react'
import { SearchX } from 'lucide-react'

type NegociosVacioProps = {
  titulo: string
  descripcion: string
  accion?: ReactNode
}

export function NegociosVacio({
  titulo,
  descripcion,
  accion,
}: NegociosVacioProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <SearchX aria-hidden="true" className="size-5 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {accion}
    </div>
  )
}
