import {
  CircleHelp,
  Minus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import type { TendenciaLead as Tendencia } from '@/features/negocios/types/api'
import { SinDato } from './sin-dato'

const TENDENCIAS: Record<Tendencia, { texto: string; Icono: LucideIcon }> = {
  empeora: { texto: 'Empeora', Icono: TrendingDown },
  estable: { texto: 'Estable', Icono: Minus },
  mejora: { texto: 'Mejora', Icono: TrendingUp },
  'sin historial': { texto: 'Sin historial', Icono: CircleHelp },
}

export function TendenciaLead({ tendencia }: { tendencia: Tendencia | null }) {
  if (!tendencia) return <SinDato />
  const { texto, Icono } = TENDENCIAS[tendencia]

  return (
    <span className="flex items-center gap-1">
      <Icono aria-hidden="true" className="size-4 text-muted-foreground" />
      {texto}
    </span>
  )
}
