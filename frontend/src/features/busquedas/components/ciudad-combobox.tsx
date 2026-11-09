import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { useCiudades } from '@/features/busquedas/api/get-ciudades'
import { useValorConDemora } from '@/features/busquedas/hooks/use-valor-con-demora'
import type { CiudadDto, PaisDto } from '@/types/api'
import { normalizarTexto } from '@/utils/normalizar-texto'
import type { CiudadElegida } from './nueva-busqueda-form.schema'

const DEMORA_BUSQUEDA_MS = 250

type Opcion =
  { tipo: 'ciudad'; ciudad: CiudadDto } | { tipo: 'agregar'; nombre: string }

type CiudadComboboxProps = {
  id: string
  pais: PaisDto | null
  elegidas: CiudadElegida[]
  onElegir: (ciudad: CiudadElegida) => void
  onAgregar: (nombre: string) => void
  agregando: boolean
  contenedor: HTMLElement | null
  invalido: boolean
  descritoPor: string
}

export function CiudadCombobox({
  id,
  pais,
  elegidas,
  onElegir,
  onAgregar,
  agregando,
  contenedor,
  invalido,
  descritoPor,
}: CiudadComboboxProps) {
  const [texto, setTexto] = useState('')
  const textoConDemora = useValorConDemora(texto, DEMORA_BUSQUEDA_MS)
  const ciudades = useCiudades(pais?.id ?? null, textoConDemora)

  const resultados = ciudades.data ?? []
  const buscando =
    ciudades.isFetching ||
    ciudades.isPlaceholderData ||
    texto !== textoConDemora
  const yaExiste = resultados.some(
    (ciudad) => normalizarTexto(ciudad.nombre) === normalizarTexto(texto),
  )

  const opciones: Opcion[] = resultados
    .filter((ciudad) => !elegidas.some((elegida) => elegida.id === ciudad.id))
    .map((ciudad) => ({ tipo: 'ciudad', ciudad }))
  if (
    texto.trim() &&
    !buscando &&
    !yaExiste &&
    !agregando &&
    !ciudades.isError
  ) {
    opciones.push({ tipo: 'agregar', nombre: texto.trim() })
  }

  function elegir(opcion: Opcion | null) {
    if (!opcion || !pais) return
    setTexto('')
    if (opcion.tipo === 'ciudad') {
      onElegir({
        id: opcion.ciudad.id,
        nombre: opcion.ciudad.nombre,
        pais_nombre: pais.nombre,
      })
      return
    }
    onAgregar(opcion.nombre)
  }

  return (
    <Combobox
      items={opciones}
      filter={null}
      value={null}
      onValueChange={elegir}
      inputValue={texto}
      onInputValueChange={setTexto}
      itemToStringLabel={() => ''}
      disabled={!pais}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        className="w-full"
        disabled={!pais}
        placeholder={
          !pais
            ? 'Elige un país primero'
            : agregando
              ? 'Agregando ciudad…'
              : 'Escribe o elige una ciudad'
        }
        aria-invalid={invalido}
        aria-describedby={descritoPor}
      />
      <ComboboxContent container={contenedor}>
        <ComboboxEmpty>
          {buscando
            ? 'Buscando…'
            : ciudades.isError
              ? 'No se pudieron cargar las ciudades'
              : 'Ninguna ciudad coincide'}
        </ComboboxEmpty>
        <ComboboxList>
          {(opcion: Opcion) =>
            opcion.tipo === 'ciudad' ? (
              <ComboboxItem key={opcion.ciudad.id} value={opcion}>
                {opcion.ciudad.nombre}
              </ComboboxItem>
            ) : (
              <ComboboxItem key="agregar" value={opcion}>
                <Plus aria-hidden="true" />
                Agregar «{opcion.nombre}»
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
