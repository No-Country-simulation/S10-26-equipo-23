import { useMemo } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { paths } from '@/config/paths'
import { useNegociosDeBusqueda } from '@/features/negocios/api/get-negocios-de-busqueda'
import {
  useParametrosTabla,
  type VistaNegocios,
} from '@/features/negocios/hooks/use-parametros-tabla'
import type { NegocioFilaDto } from '@/features/negocios/types/api'
import {
  filtrarNegocios,
  hayFiltros,
  soloLeads,
} from '@/features/negocios/utils/filtros-negocios'
import type { CiudadConPaisDto } from '@/types/api'
import { columnas } from './columns'
import { NegociosCargando } from './negocios-cargando'
import { NegociosError } from './negocios-error'
import { NegociosFiltros } from './negocios-filtros'
import { NegociosTabla } from './negocios-tabla'
import { NegociosVacio } from './negocios-vacio'

const SIN_NEGOCIOS: NegocioFilaDto[] = []

function contar(cantidad: number, singular: string, plural: string) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

function ciudadesDe(negocios: NegocioFilaDto[]) {
  const ciudades = new Map<string, CiudadConPaisDto>()
  negocios.forEach(({ ciudad }) => ciudades.set(ciudad.id, ciudad))
  return [...ciudades.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  )
}

export function NegociosSeccion({ busquedaId }: { busquedaId: string }) {
  const {
    data: negocios = SIN_NEGOCIOS,
    isPending,
    isError,
    refetch,
  } = useNegociosDeBusqueda(busquedaId)
  const { filtros, vista, cambiarFiltro, limpiarFiltros, cambiarVista } =
    useParametrosTabla()
  const filtrados = useMemo(
    () => filtrarNegocios(negocios, filtros),
    [negocios, filtros],
  )
  const leads = useMemo(() => soloLeads(filtrados), [filtrados])
  const ciudades = useMemo(() => ciudadesDe(negocios), [negocios])

  if (isPending) return <NegociosCargando />
  if (isError) return <NegociosError onReintentar={() => refetch()} />
  if (negocios.length === 0) {
    return (
      <NegociosVacio
        titulo="Esta búsqueda no encontró negocios"
        descripcion="Aquí aparecerían los negocios y leads que encontrara."
        accion={
          <Button asChild variant="outline">
            <Link to={paths.busquedas}>Ir a búsquedas</Link>
          </Button>
        }
      />
    )
  }

  const filas = vista === 'leads' ? leads : filtrados
  const resultado =
    vista === 'leads'
      ? contar(filas.length, 'lead', 'leads')
      : contar(filas.length, 'negocio', 'negocios')

  const contenido =
    filas.length > 0 ? (
      <NegociosTabla
        filas={filas}
        columnas={columnas}
        nombre={vista === 'leads' ? 'Leads' : 'Todos los negocios'}
      />
    ) : hayFiltros(filtros) ? (
      <NegociosVacio
        titulo="No hay resultados para estos filtros"
        descripcion="Prueba con otros valores o quita los filtros."
        accion={
          <Button variant="outline" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        }
      />
    ) : (
      <NegociosVacio
        titulo="Ningún negocio cumple los filtros de esta búsqueda"
        descripcion="Aquí aparecerían los leads. Aún puedes revisar todos los negocios."
        accion={
          <Button variant="outline" onClick={() => cambiarVista('negocios')}>
            Ver todos los negocios
          </Button>
        }
      />
    )

  return (
    <Tabs
      value={vista}
      onValueChange={(valor) => cambiarVista(valor as VistaNegocios)}
      className="gap-4"
    >
      <TabsList
        aria-label="Qué negocios mostrar"
        className="flex-wrap justify-start group-data-horizontal/tabs:h-auto"
      >
        <TabsTrigger value="leads" className="h-7 flex-none px-3">
          Leads ({leads.length})
        </TabsTrigger>
        <TabsTrigger value="negocios" className="h-7 flex-none px-3">
          Todos los negocios ({filtrados.length})
        </TabsTrigger>
      </TabsList>
      <p role="status" className="sr-only">
        {resultado}
      </p>
      <NegociosFiltros
        filtros={filtros}
        ciudades={ciudades}
        onCambiar={cambiarFiltro}
        onLimpiar={limpiarFiltros}
      />
      <TabsContent value="leads">{contenido}</TabsContent>
      <TabsContent value="negocios">{contenido}</TabsContent>
    </Tabs>
  )
}
