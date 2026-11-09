export const ESTADOS_BUSQUEDA = [
  'en_curso',
  'completada',
  'fallida',
  'cancelada',
] as const;

export type EstadoBusqueda = (typeof ESTADOS_BUSQUEDA)[number];

export type EstadoFinal = Exclude<EstadoBusqueda, 'en_curso'>;

export const FILTROS_POR_DEFECTO = {
  rating_minimo: 1.5,
  rating_maximo: 3.5,
  min_resenas: 10,
} as const;

export type Filtros = {
  rating_minimo: number | null;
  rating_maximo: number | null;
  min_resenas: number | null;
};

export function filtrosEfectivos(filtros: Filtros) {
  return {
    rating_minimo: filtros.rating_minimo ?? FILTROS_POR_DEFECTO.rating_minimo,
    rating_maximo: filtros.rating_maximo ?? FILTROS_POR_DEFECTO.rating_maximo,
    min_resenas: filtros.min_resenas ?? FILTROS_POR_DEFECTO.min_resenas,
  };
}

export function cumpleFiltros(
  filtros: Filtros,
  rating: number | null,
  nResenas: number | null,
) {
  if (rating === null || nResenas === null) {
    return false;
  }
  const efectivos = filtrosEfectivos(filtros);
  return (
    rating >= efectivos.rating_minimo &&
    rating <= efectivos.rating_maximo &&
    nResenas > efectivos.min_resenas
  );
}
