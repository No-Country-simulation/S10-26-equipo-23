import { useId } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ORDENES,
  type FiltrosResenas,
} from '@/features/negocios/utils/filtros-resenas'

type ResenasOrdenProps = {
  orden: FiltrosResenas['orden']
  onCambiar: (valor: string) => void
}

export function ResenasOrden({ orden, onCambiar }: ResenasOrdenProps) {
  const id = useId()

  return (
    <Field className="w-44">
      <FieldLabel htmlFor={id}>Ordenar por</FieldLabel>
      <Select
        value={orden}
        onValueChange={(valor) => onCambiar(valor === 'recientes' ? '' : valor)}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="end">
          {Object.entries(ORDENES).map(([valor, texto]) => (
            <SelectItem key={valor} value={valor}>
              {texto}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
