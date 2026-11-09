import { useSearchParams } from 'react-router'
import { Paginacion } from '@/components/layout/paginacion'
import { useBusquedas } from '@/features/busquedas/api/get-busquedas'
import {
  CLASES_CUADRICULA,
  FICHAS_POR_PAGINA,
  contarPaginas,
} from '@/features/busquedas/utils/paginacion'
import type { BusquedaDto } from '@/types/api'
import { leerPagina } from '@/utils/paginacion'
import { BusquedaCard } from './busqueda-card'
import { BusquedasCargando } from './busquedas-cargando'
import { BusquedasError } from './busquedas-error'
import { BusquedasVacio } from './busquedas-vacio'

type BusquedasGridProps = {
  onNueva: () => void
  onVolverAEjecutar: (busqueda: BusquedaDto) => void
}

export function BusquedasGrid({
  onNueva,
  onVolverAEjecutar,
}: BusquedasGridProps) {
  const { data: busquedas, isPending, isError, refetch } = useBusquedas()
  const [searchParams] = useSearchParams()

  if (isPending) return <BusquedasCargando />
  if (isError) return <BusquedasError onReintentar={() => refetch()} />
  if (busquedas.length === 0) return <BusquedasVacio onNueva={onNueva} />

  const total = contarPaginas(busquedas.length)
  const pagina = leerPagina(searchParams.get('pagina'), total)
  const visibles = busquedas.slice(
    (pagina - 1) * FICHAS_POR_PAGINA,
    pagina * FICHAS_POR_PAGINA,
  )

  return (
    <>
      <ul className={CLASES_CUADRICULA}>
        {visibles.map((busqueda) => (
          <li key={busqueda.id}>
            <BusquedaCard
              busqueda={busqueda}
              onVolverAEjecutar={onVolverAEjecutar}
            />
          </li>
        ))}
      </ul>
      {total > 1 && <Paginacion pagina={pagina} total={total} />}
    </>
  )
}
