import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { usePaises } from '@/features/busquedas/api/get-paises'
import type { PaisDto } from '@/types/api'

type PaisComboboxProps = {
  id: string
  valor: PaisDto | null
  onCambio: (pais: PaisDto | null) => void
  contenedor: HTMLElement | null
}

export function PaisCombobox({
  id,
  valor,
  onCambio,
  contenedor,
}: PaisComboboxProps) {
  const { data: paises = [], isPending, isError } = usePaises()

  return (
    <Combobox
      items={paises}
      value={valor}
      onValueChange={onCambio}
      itemToStringLabel={(pais: PaisDto) => pais.nombre}
      isItemEqualToValue={(a: PaisDto, b: PaisDto) => a.id === b.id}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder="Escribe o elige un país"
      />
      <ComboboxContent container={contenedor}>
        <ComboboxEmpty>
          {isPending && 'Cargando países…'}
          {isError && 'No se pudieron cargar los países'}
          {!isPending && !isError && 'Ningún país coincide'}
        </ComboboxEmpty>
        <ComboboxList>
          {(pais: PaisDto) => (
            <ComboboxItem key={pais.id} value={pais}>
              {pais.nombre}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
