import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  PARAMETROS_RESENAS,
  leerFiltrosResenas,
} from '@/features/negocios/utils/filtros-resenas'

const PARAMETRO_PAGINA = 'pagina'

export type FiltroResenas = keyof typeof PARAMETROS_RESENAS

export function useFiltrosResenas() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = useMemo(
    () => leerFiltrosResenas(searchParams),
    [searchParams],
  )

  function cambiarParametros(cambios: Partial<Record<FiltroResenas, string>>) {
    setSearchParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos)
        Object.entries(cambios).forEach(([filtro, valor]) => {
          const nombre = PARAMETROS_RESENAS[filtro as FiltroResenas]
          if (valor) {
            siguientes.set(nombre, valor)
          } else {
            siguientes.delete(nombre)
          }
        })
        siguientes.delete(PARAMETRO_PAGINA)
        return siguientes
      },
      { replace: true },
    )
  }

  function cambiar(filtro: FiltroResenas, valor: string) {
    cambiarParametros({ [filtro]: valor })
  }

  function limpiar() {
    cambiarParametros({
      estrellas: '',
      antiguedad: '',
      respuesta: '',
    })
  }

  return { searchParams, filtros, cambiar, limpiar }
}
