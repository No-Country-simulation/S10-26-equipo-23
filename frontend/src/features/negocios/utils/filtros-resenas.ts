import type { ResenaDto } from '@/features/negocios/types/api'

export const PARAMETROS_RESENAS = {
  estrellas: 'estrellas',
  antiguedad: 'antiguedad',
  respuesta: 'respuesta',
  orden: 'orden',
} as const

export const ANTIGUEDADES = {
  mes: { texto: 'Último mes', meses: 1 },
  'seis-meses': { texto: 'Últimos 6 meses', meses: 6 },
  anio: { texto: 'Último año', meses: 12 },
} as const

export const RESPUESTAS = {
  respondidas: 'Respondidas',
  'sin-respuesta': 'Sin respuesta',
} as const

export const ORDENES = {
  recientes: 'Más recientes',
  peores: 'Peor calificadas',
} as const

export const ESTRELLAS = [1, 2, 3, 4, 5]

type Antiguedad = keyof typeof ANTIGUEDADES
type Respuesta = keyof typeof RESPUESTAS
type Orden = keyof typeof ORDENES

export type FiltrosResenas = {
  estrellas: number[]
  antiguedad: Antiguedad | null
  respuesta: Respuesta | null
  orden: Orden
}

function leerOpcion<T extends string>(
  opciones: Record<T, unknown>,
  valor: string | null,
) {
  return valor !== null && valor in opciones ? (valor as T) : null
}

export function leerFiltrosResenas(
  searchParams: URLSearchParams,
): FiltrosResenas {
  const estrellas = (searchParams.get(PARAMETROS_RESENAS.estrellas) ?? '')
    .split(',')
    .map(Number)
    .filter((valor) => ESTRELLAS.includes(valor))
  return {
    estrellas,
    antiguedad: leerOpcion(
      ANTIGUEDADES,
      searchParams.get(PARAMETROS_RESENAS.antiguedad),
    ),
    respuesta: leerOpcion(
      RESPUESTAS,
      searchParams.get(PARAMETROS_RESENAS.respuesta),
    ),
    orden:
      leerOpcion(ORDENES, searchParams.get(PARAMETROS_RESENAS.orden)) ??
      'recientes',
  }
}

export function hayFiltrosResenas(filtros: FiltrosResenas) {
  return (
    filtros.estrellas.length > 0 ||
    filtros.antiguedad !== null ||
    filtros.respuesta !== null
  )
}

export function filtrarResenas(resenas: ResenaDto[], filtros: FiltrosResenas) {
  const maximoMeses = filtros.antiguedad
    ? ANTIGUEDADES[filtros.antiguedad].meses
    : null
  const filtradas = resenas.filter((resena) => {
    if (
      filtros.estrellas.length > 0 &&
      (resena.rating === null || !filtros.estrellas.includes(resena.rating))
    ) {
      return false
    }
    if (
      maximoMeses !== null &&
      (resena.meses_atras === null || resena.meses_atras > maximoMeses)
    ) {
      return false
    }
    if (filtros.respuesta === 'respondidas' && resena.respondida !== true) {
      return false
    }
    if (filtros.respuesta === 'sin-respuesta' && resena.respondida !== false) {
      return false
    }
    return true
  })
  if (filtros.orden === 'recientes') return filtradas
  return filtradas.sort(
    (a, b) =>
      (a.rating ?? Infinity) - (b.rating ?? Infinity) ||
      (a.meses_atras ?? Infinity) - (b.meses_atras ?? Infinity),
  )
}
