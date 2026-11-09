import { createBrowserRouter, Navigate } from 'react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { paths } from '@/config/paths'
import { RouteErrorPage } from './routes/route-error'

export const router = createBrowserRouter([
  {
    path: paths.inicio,
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: () => null,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to={paths.busquedas} replace /> },
          {
            path: paths.busquedas,
            lazy: async () => ({
              Component: (await import('./routes/busquedas')).BusquedasPage,
            }),
          },
          {
            path: paths.rutaDetalleBusqueda,
            lazy: async () => ({
              Component: (await import('./routes/detalle-busqueda'))
                .DetalleBusquedaPage,
            }),
          },
          {
            path: paths.rutaDetalleNegocio,
            lazy: async () => ({
              Component: (await import('./routes/detalle-negocio'))
                .DetalleNegocioPage,
            }),
          },
          {
            path: '*',
            lazy: async () => ({
              Component: (await import('./routes/not-found')).NotFoundPage,
            }),
          },
        ],
      },
    ],
  },
])
