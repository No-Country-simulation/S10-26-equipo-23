import { useTable, type ColumnDef } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from 'cn'
import { Paginacion } from '@/components/layout/paginacion'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { NegocioFilaDto } from '@/features/negocios/types/api'
import { useParametrosTabla } from '@/features/negocios/hooks/use-parametros-tabla'
import { leerPagina } from '@/utils/paginacion'
import { COLUMNAS_ANGOSTAS, COLUMNAS_NUMERICAS } from './columns'
import { tablaFeatures } from './tabla-features'

const FILAS_POR_PAGINA = 50
const PARAMETRO_ORDEN = 'orden'
const ORDEN_POR_DEFECTO = 'rating'
const ORDEN_ARIA = { asc: 'ascending', desc: 'descending' } as const

const ICONOS_ORDEN = {
  asc: ArrowUp,
  desc: ArrowDown,
}

type NegociosTablaProps = {
  filas: NegocioFilaDto[]
  columnas: ColumnDef<typeof tablaFeatures, NegocioFilaDto>[]
  nombre: string
}

function leerOrden(
  valor: string | null,
  columnas: NegociosTablaProps['columnas'],
) {
  const texto = valor ?? ORDEN_POR_DEFECTO
  const desc = texto.startsWith('-')
  const id = desc ? texto.slice(1) : texto
  const existe = columnas.some((columna) => columna.id === id)
  return existe ? [{ id, desc }] : [{ id: ORDEN_POR_DEFECTO, desc: false }]
}

export function NegociosTabla({ filas, columnas, nombre }: NegociosTablaProps) {
  const { searchParams, cambiarParametros } = useParametrosTabla()
  const total = Math.max(1, Math.ceil(filas.length / FILAS_POR_PAGINA))
  const pagina = leerPagina(searchParams.get('pagina'), total)
  const sorting = leerOrden(searchParams.get(PARAMETRO_ORDEN), columnas)

  const table = useTable({
    features: tablaFeatures,
    columns: columnas,
    data: filas,
    state: {
      sorting,
      pagination: { pageIndex: pagina - 1, pageSize: FILAS_POR_PAGINA },
    },
    autoResetPageIndex: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
    onSortingChange: (actualizador) => {
      const [orden] =
        typeof actualizador === 'function'
          ? actualizador(sorting)
          : actualizador
      const texto = orden.desc ? `-${orden.id}` : orden.id
      cambiarParametros({
        [PARAMETRO_ORDEN]: texto === ORDEN_POR_DEFECTO ? '' : texto,
      })
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table
          aria-label={nombre}
          containerClassName="max-h-160 scheme-dark"
          className="min-w-5xl border-separate border-spacing-0"
        >
          <TableHeader className="sticky top-0 z-10 bg-secondary">
            {table.getHeaderGroups().map((grupo) => (
              <TableRow
                key={grupo.id}
                className="border-b-0 hover:bg-transparent"
              >
                {grupo.headers.map((encabezado) => {
                  const numerica = COLUMNAS_NUMERICAS.has(encabezado.column.id)
                  const orden = encabezado.column.getIsSorted()
                  const Icono = orden ? ICONOS_ORDEN[orden] : ArrowUpDown

                  return (
                    <TableHead
                      key={encabezado.id}
                      scope="col"
                      aria-sort={orden ? ORDEN_ARIA[orden] : undefined}
                      className={cn(
                        'h-12 border-b-2 border-input px-3',
                        numerica && 'px-2',
                        COLUMNAS_ANGOSTAS.has(encabezado.column.id) && 'px-1',
                      )}
                    >
                      {encabezado.column.getCanSort() ? (
                        <Button
                          variant="outline"
                          className={cn(
                            orden &&
                              'border-primary bg-accent dark:border-primary dark:bg-accent',
                          )}
                          onClick={encabezado.column.getToggleSortingHandler()}
                        >
                          <table.FlexRender header={encabezado} />
                          <Icono
                            aria-hidden="true"
                            className={cn(!orden && 'text-muted-foreground')}
                          />
                        </Button>
                      ) : (
                        <table.FlexRender header={encabezado} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&>tr:last-child>td]:border-b-0">
            {table.getRowModel().rows.map((fila) => (
              <TableRow key={fila.id} className="border-b-0">
                {fila.getAllCells().map((celda) => (
                  <TableCell
                    key={celda.id}
                    className={cn(
                      'border-b px-3 py-3',
                      COLUMNAS_NUMERICAS.has(celda.column.id) &&
                        'px-2 tabular-nums',
                      COLUMNAS_ANGOSTAS.has(celda.column.id) && 'px-1',
                    )}
                  >
                    <table.FlexRender cell={celda} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {total > 1 && <Paginacion pagina={pagina} total={total} />}
    </div>
  )
}
