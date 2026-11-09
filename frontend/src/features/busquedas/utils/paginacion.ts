export const FICHAS_POR_PAGINA = 6

export const CLASES_CUADRICULA =
  'grid flex-1 content-start gap-4 lg:mb-auto lg:max-h-120 lg:min-h-fit lg:grid-cols-3 lg:grid-rows-[repeat(2,minmax(min-content,1fr))]'

export function contarPaginas(fichas: number) {
  return Math.max(1, Math.ceil(fichas / FICHAS_POR_PAGINA))
}
