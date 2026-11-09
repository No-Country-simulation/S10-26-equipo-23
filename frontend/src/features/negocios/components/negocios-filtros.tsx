import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  esRatingInvalido,
  hayFiltros,
  type FiltrosNegocios,
} from '@/features/negocios/utils/filtros-negocios'
import type { CiudadConPaisDto } from '@/types/api'

const TODAS_LAS_CIUDADES = 'todas'
const ERROR_RATING = { message: 'Escribe un número de 1 a 5' }

type NegociosFiltrosProps = {
  filtros: FiltrosNegocios
  ciudades: CiudadConPaisDto[]
  onCambiar: (filtro: keyof FiltrosNegocios, valor: string) => void
  onLimpiar: () => void
}

export function NegociosFiltros({
  filtros,
  ciudades,
  onCambiar,
  onLimpiar,
}: NegociosFiltrosProps) {
  const id = useId()
  const ids = {
    texto: `${id}-texto`,
    ratingMinimo: `${id}-rating-minimo`,
    ratingMaximo: `${id}-rating-maximo`,
    ciudad: `${id}-ciudad`,
  }
  const minimoInvalido = esRatingInvalido(filtros.ratingMinimo)
  const maximoInvalido = esRatingInvalido(filtros.ratingMaximo)

  return (
    <div className="flex flex-wrap items-start gap-4">
      <Field className="w-64">
        <FieldLabel htmlFor={ids.texto}>Buscar negocio</FieldLabel>
        <Input
          id={ids.texto}
          type="search"
          autoComplete="off"
          value={filtros.texto}
          onChange={(evento) => onCambiar('texto', evento.target.value)}
        />
      </Field>
      <Field className="w-40" data-invalid={minimoInvalido}>
        <FieldLabel htmlFor={ids.ratingMinimo}>Calificación mínima</FieldLabel>
        <Input
          id={ids.ratingMinimo}
          inputMode="decimal"
          autoComplete="off"
          value={filtros.ratingMinimo}
          aria-invalid={minimoInvalido}
          aria-describedby={`${ids.ratingMinimo}-error`}
          onChange={(evento) => onCambiar('ratingMinimo', evento.target.value)}
        />
        <FieldError
          id={`${ids.ratingMinimo}-error`}
          errors={minimoInvalido ? [ERROR_RATING] : []}
        />
      </Field>
      <Field className="w-40" data-invalid={maximoInvalido}>
        <FieldLabel htmlFor={ids.ratingMaximo}>Calificación máxima</FieldLabel>
        <Input
          id={ids.ratingMaximo}
          inputMode="decimal"
          autoComplete="off"
          value={filtros.ratingMaximo}
          aria-invalid={maximoInvalido}
          aria-describedby={`${ids.ratingMaximo}-error`}
          onChange={(evento) => onCambiar('ratingMaximo', evento.target.value)}
        />
        <FieldError
          id={`${ids.ratingMaximo}-error`}
          errors={maximoInvalido ? [ERROR_RATING] : []}
        />
      </Field>
      <Field className="w-64">
        <FieldLabel htmlFor={ids.ciudad}>Ciudad</FieldLabel>
        <Select
          value={filtros.ciudad || TODAS_LAS_CIUDADES}
          onValueChange={(valor) =>
            onCambiar('ciudad', valor === TODAS_LAS_CIUDADES ? '' : valor)
          }
        >
          <SelectTrigger id={ids.ciudad} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={TODAS_LAS_CIUDADES}>
              Todas las ciudades
            </SelectItem>
            {ciudades.map((ciudad) => (
              <SelectItem key={ciudad.id} value={ciudad.id}>
                {ciudad.nombre}, {ciudad.pais.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {hayFiltros(filtros) && (
        <Button variant="ghost" className="mt-6" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )
}
