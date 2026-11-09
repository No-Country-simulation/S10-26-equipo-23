import type { ReactNode } from 'react'

type PageHeaderProps = {
  titulo: string
  descripcion?: ReactNode
  accion?: ReactNode
}

export function PageHeader({ titulo, descripcion, accion }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && (
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {accion}
    </div>
  )
}
