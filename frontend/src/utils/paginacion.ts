const PAGINAS_SIN_RECORTAR = 7

export function leerPagina(valor: string | null, total: number) {
  const pagina = Number(valor)
  if (!Number.isInteger(pagina) || pagina < 1) return 1
  return Math.min(pagina, total)
}

export function numerosDePagina(pagina: number, total: number) {
  if (total <= PAGINAS_SIN_RECORTAR) {
    return Array.from({ length: total }, (_, indice) => indice + 1)
  }
  if (pagina <= 4) return [1, 2, 3, 4, 5, null, total]
  if (pagina >= total - 3) {
    return [1, null, total - 4, total - 3, total - 2, total - 1, total]
  }
  return [1, null, pagina - 1, pagina, pagina + 1, null, total]
}
