import type { NegocioFilaDto } from '@/features/negocios/types/api'
import { normalizarTexto } from '@/utils/normalizar-texto'

export const PARAMETROS_FILTRO = {
  texto: 'buscar',
  ratingMinimo: 'rating_min',
  ratingMaximo: 'rating_max',
  ciudad: 'ciudad',
} as const

export type FiltrosNegocios = Record<keyof typeof PARAMETROS_FILTRO, string>

const RATING_MINIMO = 1
const RATING_MAXIMO = 5

export function leerFiltros(searchParams: URLSearchParams): FiltrosNegocios {
  return {
    texto: searchParams.get(PARAMETROS_FILTRO.texto) ?? '',
    ratingMinimo: searchParams.get(PARAMETROS_FILTRO.ratingMinimo) ?? '',
    ratingMaximo: searchParams.get(PARAMETROS_FILTRO.ratingMaximo) ?? '',
    ciudad: searchParams.get(PARAMETROS_FILTRO.ciudad) ?? '',
  }
}

export function hayFiltros(filtros: FiltrosNegocios) {
  return Object.values(filtros).some(Boolean)
}

function leerRating(valor: string) {
  if (!valor.trim()) return null
  const rating = Number(valor.replace(',', '.'))
  if (
    Number.isNaN(rating) ||
    rating < RATING_MINIMO ||
    rating > RATING_MAXIMO
  ) {
    return null
  }
  return rating
}

export function esRatingInvalido(valor: string) {
  return valor.trim() !== '' && leerRating(valor) === null
}

export function filtrarNegocios(
  negocios: NegocioFilaDto[],
  filtros: FiltrosNegocios,
) {
  const texto = normalizarTexto(filtros.texto)
  const ratingMinimo = leerRating(filtros.ratingMinimo)
  const ratingMaximo = leerRating(filtros.ratingMaximo)

  return negocios.filter((negocio) => {
    if (texto && !normalizarTexto(negocio.nombre).includes(texto)) return false
    if (filtros.ciudad && negocio.ciudad.id !== filtros.ciudad) return false
    if (
      ratingMinimo !== null &&
      (negocio.rating === null || negocio.rating < ratingMinimo)
    ) {
      return false
    }
    if (
      ratingMaximo !== null &&
      (negocio.rating === null || negocio.rating > ratingMaximo)
    ) {
      return false
    }
    return true
  })
}

export function soloLeads(negocios: NegocioFilaDto[]) {
  return negocios.filter(({ lead }) => lead !== null)
}
