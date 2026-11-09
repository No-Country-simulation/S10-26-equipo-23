import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  PARAMETROS_FILTRO,
  leerFiltros,
  type FiltrosNegocios,
} from '@/features/negocios/utils/filtros-negocios'

export type VistaNegocios = 'leads' | 'negocios'

const PARAMETRO_VISTA = 'vista'
const PARAMETRO_PAGINA = 'pagina'

export function useParametrosTabla() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filtros = useMemo(() => leerFiltros(searchParams), [searchParams])
  const vista: VistaNegocios =
    searchParams.get(PARAMETRO_VISTA) === 'negocios' ? 'negocios' : 'leads'

  function cambiarParametros(cambios: Record<string, string>) {
    setSearchParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos)
        Object.entries(cambios).forEach(([nombre, valor]) => {
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

  function cambiarFiltro(filtro: keyof FiltrosNegocios, valor: string) {
    cambiarParametros({ [PARAMETROS_FILTRO[filtro]]: valor })
  }

  function limpiarFiltros() {
    cambiarParametros(
      Object.fromEntries(
        Object.values(PARAMETROS_FILTRO).map((nombre) => [nombre, '']),
      ),
    )
  }

  function cambiarVista(siguiente: VistaNegocios) {
    cambiarParametros({
      [PARAMETRO_VISTA]: siguiente === 'negocios' ? siguiente : '',
    })
  }

  return {
    searchParams,
    filtros,
    vista,
    cambiarParametros,
    cambiarFiltro,
    limpiarFiltros,
    cambiarVista,
  }
}
