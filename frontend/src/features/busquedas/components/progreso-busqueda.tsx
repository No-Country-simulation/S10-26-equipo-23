import { cn } from 'cn'
import { Progress } from '@/components/ui/progress'
import { useProgresoBusqueda } from '@/features/busquedas/api/get-progreso-busqueda'
import type { ProgresoDto } from '@/types/api'

const FASES: Record<ProgresoDto['fase'], { texto: string; unidad: string }> = {
  1: { texto: 'Buscando negocios', unidad: 'ciudades' },
  2: { texto: 'Revisando fichas', unidad: 'negocios' },
  3: { texto: 'Detectando problemas con Gemini', unidad: 'grupos de leads' },
}

function describir(progreso: ProgresoDto | null) {
  if (!progreso) {
    return 'Preparando la búsqueda…'
  }
  if (progreso.fase === 3) {
    const { texto, unidad } = FASES[3]
    return `${texto}: ${progreso.hechas} de ${progreso.total} ${unidad}`
  }
  const sesion = `Sesión ${progreso.sesion}`
  if (progreso.total === 0) {
    return `${sesion} · Preparando la revisión de fichas…`
  }
  const { texto, unidad } = FASES[progreso.fase]
  return `${sesion} · ${texto}: ${progreso.hechas} de ${progreso.total} ${unidad}`
}

type ProgresoBusquedaProps = {
  busquedaId: string
  className?: string
}

export function ProgresoBusqueda({
  busquedaId,
  className,
}: ProgresoBusquedaProps) {
  const progreso = useProgresoBusqueda(busquedaId)
  const porcentaje =
    progreso && progreso.total > 0
      ? Math.round((progreso.hechas / progreso.total) * 100)
      : null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <p role="status" className="text-xs text-muted-foreground tabular-nums">
        {describir(progreso)}
      </p>
      {porcentaje !== null && (
        <Progress
          value={porcentaje}
          aria-label="Avance de la sesión"
          className="bg-border"
        />
      )}
    </div>
  )
}
