import {
  Ban,
  CircleCheck,
  CircleX,
  LoaderCircle,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { EstadoBusqueda } from '@/types/api'

const ESTADOS: Record<
  EstadoBusqueda,
  { texto: string; Icono: LucideIcon; className: string }
> = {
  en_curso: {
    texto: 'En curso',
    Icono: LoaderCircle,
    className: 'bg-info text-status-foreground',
  },
  completada: {
    texto: 'Completada',
    Icono: CircleCheck,
    className: 'bg-success text-status-foreground',
  },
  fallida: {
    texto: 'Fallida',
    Icono: CircleX,
    className: 'bg-destructive text-destructive-foreground',
  },
  cancelada: {
    texto: 'Cancelada',
    Icono: Ban,
    className: 'border-border bg-transparent text-foreground',
  },
}

export function EstadoBusquedaBadge({ estado }: { estado: EstadoBusqueda }) {
  const { texto, Icono, className } = ESTADOS[estado]

  return (
    <Badge className={className}>
      <Icono aria-hidden="true" />
      {texto}
    </Badge>
  )
}
