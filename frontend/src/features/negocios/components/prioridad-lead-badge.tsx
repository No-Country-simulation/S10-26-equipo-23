import { Badge } from '@/components/ui/badge'
import type { PrioridadLead } from '@/features/negocios/types/api'
import { SinDato } from './sin-dato'

const CLASES: Record<PrioridadLead, string> = {
  Alta: 'bg-warning text-status-foreground',
  Media: 'bg-info text-status-foreground',
}

export function PrioridadLeadBadge({
  prioridad,
}: {
  prioridad: PrioridadLead | null
}) {
  if (!prioridad) return <SinDato />
  return <Badge className={CLASES[prioridad]}>{prioridad}</Badge>
}
