export const paths = {
  inicio: '/',
  busquedas: '/busquedas',
  rutaDetalleBusqueda: '/busquedas/:id',
  detalleBusqueda: (id: string) => `/busquedas/${id}`,
  rutaDetalleNegocio: '/negocios/:id',
  detalleNegocio: (id: string) => `/negocios/${id}`,
} as const
