import { useSearchParams } from 'react-router'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { numerosDePagina } from '@/utils/paginacion'

type PaginacionProps = {
  pagina: number
  total: number
}

export function Paginacion({ pagina, total }: PaginacionProps) {
  const [searchParams] = useSearchParams()

  function buscarPagina(numero: number) {
    const siguientes = new URLSearchParams(searchParams)
    if (numero === 1) {
      siguientes.delete('pagina')
    } else {
      siguientes.set('pagina', String(numero))
    }
    return siguientes.toString()
  }

  return (
    <>
      <p role="status" className="sr-only">
        Página {pagina} de {total}
      </p>
      <Pagination>
        <PaginationContent>
          {numerosDePagina(pagina, total).map((numero, indice) => (
            <PaginationItem key={numero ?? `elipsis-${indice}`}>
              {numero === null ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  to={{ search: buscarPagina(numero) }}
                  isActive={numero === pagina}
                  aria-label={`Página ${numero}`}
                >
                  {numero}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
        </PaginationContent>
      </Pagination>
    </>
  )
}
