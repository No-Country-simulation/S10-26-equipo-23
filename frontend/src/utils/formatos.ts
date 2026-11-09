const formatoRating = new Intl.NumberFormat('es', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatearRating(rating: number) {
  return formatoRating.format(rating)
}

const formatoPorcentaje = new Intl.NumberFormat('es', {
  style: 'percent',
  maximumFractionDigits: 0,
})

export function formatearPorcentaje(proporcion: number) {
  return formatoPorcentaje.format(proporcion)
}

export function formatearRubro(rubro: string) {
  return rubro.charAt(0).toLocaleUpperCase('es') + rubro.slice(1)
}

export function formatearFecha(iso: string) {
  const fecha = new Date(iso)
  return fecha.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year:
      fecha.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}
