import { useMemo } from 'react'
import { Reply, SearchX, Star } from 'lucide-react'
import { Paginacion } from '@/components/layout/paginacion'
import { Button } from '@/components/ui/button'
import { useFiltrosResenas } from '@/features/negocios/hooks/use-filtros-resenas'
import type { ResenaDto } from '@/features/negocios/types/api'
import { filtrarResenas } from '@/features/negocios/utils/filtros-resenas'
import { leerPagina } from '@/utils/paginacion'
import { DetalleCard } from './detalle-card'
import { ResenasFiltros } from './resenas-filtros'
import { ResenasOrden } from './resenas-orden'

const RESENAS_POR_PAGINA = 10

function contarResenas(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? 'reseña' : 'reseñas'}`
}

function haceCuanto(meses: number) {
  if (meses === 0) return 'Hace menos de un mes'
  if (meses < 12) return meses === 1 ? 'Hace 1 mes' : `Hace ${meses} meses`
  const anios = Math.floor(meses / 12)
  return anios === 1 ? 'Hace 1 año' : `Hace ${anios} años`
}

function Resena({ resena }: { resena: ResenaDto }) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{resena.autor ?? 'Autor anónimo'}</span>
        {resena.rating !== null && (
          <span className="flex items-center gap-1 tabular-nums">
            <Star aria-hidden="true" className="size-4 text-muted-foreground" />
            {resena.rating}
            <span className="sr-only">de 5 estrellas</span>
          </span>
        )}
        {resena.fuente && (
          <span className="text-xs text-muted-foreground">{resena.fuente}</span>
        )}
        {resena.meses_atras !== null && (
          <time
            dateTime={resena.fecha_aprox ?? undefined}
            className="text-xs text-muted-foreground"
          >
            {haceCuanto(resena.meses_atras)}
          </time>
        )}
      </div>
      <p className={resena.texto ? undefined : 'text-muted-foreground'}>
        {resena.texto ?? 'Reseña sin texto.'}
      </p>
      {resena.respondida !== null && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Reply aria-hidden="true" className="size-4" />
          {resena.respondida
            ? 'Respondida por el negocio'
            : 'Sin respuesta del negocio'}
        </p>
      )}
    </li>
  )
}

export function NegocioResenas({ resenas }: { resenas: ResenaDto[] }) {
  const { searchParams, filtros, cambiar, limpiar } = useFiltrosResenas()
  const filtradas = useMemo(
    () => filtrarResenas(resenas, filtros),
    [resenas, filtros],
  )
  const total = Math.max(1, Math.ceil(filtradas.length / RESENAS_POR_PAGINA))
  const pagina = leerPagina(searchParams.get('pagina'), total)
  const visibles = filtradas.slice(
    (pagina - 1) * RESENAS_POR_PAGINA,
    pagina * RESENAS_POR_PAGINA,
  )

  if (resenas.length === 0) {
    return (
      <DetalleCard titulo="Reseñas">
        <p className="text-muted-foreground">
          No se extrajeron reseñas de este negocio.
        </p>
      </DetalleCard>
    )
  }

  return (
    <DetalleCard titulo="Reseñas">
      <div className="flex flex-col gap-6">
        <ResenasFiltros
          filtros={filtros}
          onCambiar={cambiar}
          onLimpiar={limpiar}
        />
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p role="status" className="text-sm text-muted-foreground">
            {filtradas.length === resenas.length
              ? contarResenas(resenas.length)
              : `${filtradas.length} de ${contarResenas(resenas.length)}`}
          </p>
          <ResenasOrden
            orden={filtros.orden}
            onCambiar={(valor) => cambiar('orden', valor)}
          />
        </div>
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <SearchX
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            <p>No hay reseñas con estos filtros.</p>
            <Button variant="outline" onClick={limpiar}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {visibles.map((resena) => (
              <Resena key={resena.id} resena={resena} />
            ))}
          </ul>
        )}
        {total > 1 && <Paginacion pagina={pagina} total={total} />}
      </div>
    </DetalleCard>
  )
}
