export const busquedasKeys = {
  all: ['busquedas'] as const,
  lista: () => [...busquedasKeys.all, 'lista'] as const,
  detalle: (id: string) => [...busquedasKeys.all, 'detalle', id] as const,
  crear: () => [...busquedasKeys.all, 'crear'] as const,
  importar: () => [...busquedasKeys.all, 'importar'] as const,
}

export const catalogosKeys = {
  paises: ['paises'] as const,
  ciudadesDePais: (paisId: string) =>
    [...catalogosKeys.paises, paisId, 'ciudades'] as const,
  ciudades: (paisId: string, nombre: string) =>
    [...catalogosKeys.ciudadesDePais(paisId), nombre] as const,
}
