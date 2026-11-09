import type { ReactNode } from 'react'
import { cn } from 'cn'

type MensajePaginaProps = {
  icono: ReactNode
  titulo: string
  descripcion: string
  contenido?: ReactNode
  acciones: ReactNode
  className?: string
}

export function MensajePagina({
  icono,
  titulo,
  descripcion,
  contenido,
  acciones,
  className,
}: MensajePaginaProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center',
        className,
      )}
    >
      {icono}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {contenido}
      <div className="flex flex-wrap justify-center gap-2">{acciones}</div>
    </div>
  )
}
