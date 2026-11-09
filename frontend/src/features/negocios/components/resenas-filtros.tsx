import { useId } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldTitle } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { FiltroResenas } from '@/features/negocios/hooks/use-filtros-resenas'
import {
  ANTIGUEDADES,
  ESTRELLAS,
  RESPUESTAS,
  hayFiltrosResenas,
  type FiltrosResenas,
} from '@/features/negocios/utils/filtros-resenas'

const TODAS = 'todas'

type ResenasFiltrosProps = {
  filtros: FiltrosResenas
  onCambiar: (filtro: FiltroResenas, valor: string) => void
  onLimpiar: () => void
}

export function ResenasFiltros({
  filtros,
  onCambiar,
  onLimpiar,
}: ResenasFiltrosProps) {
  const id = useId()
  const ids = {
    estrellas: `${id}-estrellas`,
    antiguedad: `${id}-antiguedad`,
    respuesta: `${id}-respuesta`,
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Field className="w-fit">
        <FieldTitle id={ids.estrellas}>Estrellas</FieldTitle>
        <ToggleGroup
          type="multiple"
          variant="outline"
          aria-labelledby={ids.estrellas}
          value={filtros.estrellas.map(String)}
          onValueChange={(valores) =>
            onCambiar(
              'estrellas',
              valores
                .map(Number)
                .sort((a, b) => a - b)
                .join(','),
            )
          }
        >
          {ESTRELLAS.map((estrellas) => (
            <ToggleGroupItem
              key={estrellas}
              value={String(estrellas)}
              aria-label={`${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'}`}
            >
              {estrellas}
              <Star
                aria-hidden="true"
                className="fill-muted-foreground text-muted-foreground"
              />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <Field className="w-40">
        <FieldLabel htmlFor={ids.antiguedad}>Antigüedad</FieldLabel>
        <Select
          value={filtros.antiguedad ?? TODAS}
          onValueChange={(valor) =>
            onCambiar('antiguedad', valor === TODAS ? '' : valor)
          }
        >
          <SelectTrigger id={ids.antiguedad} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={TODAS}>Todas</SelectItem>
            {Object.entries(ANTIGUEDADES).map(([valor, { texto }]) => (
              <SelectItem key={valor} value={valor}>
                {texto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="w-36">
        <FieldLabel htmlFor={ids.respuesta}>Respuesta</FieldLabel>
        <Select
          value={filtros.respuesta ?? TODAS}
          onValueChange={(valor) =>
            onCambiar('respuesta', valor === TODAS ? '' : valor)
          }
        >
          <SelectTrigger id={ids.respuesta} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={TODAS}>Todas</SelectItem>
            {Object.entries(RESPUESTAS).map(([valor, texto]) => (
              <SelectItem key={valor} value={valor}>
                {texto}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {hayFiltrosResenas(filtros) && (
        <Button variant="ghost" className="mt-6" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
