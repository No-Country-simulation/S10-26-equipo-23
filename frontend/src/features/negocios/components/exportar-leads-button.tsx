import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNegociosDeBusqueda } from '@/features/negocios/api/get-negocios-de-busqueda'
import { useParametrosTabla } from '@/features/negocios/hooks/use-parametros-tabla'
import { exportarLeads } from '@/features/negocios/utils/exportar-leads'
import {
  filtrarNegocios,
  soloLeads,
} from '@/features/negocios/utils/filtros-negocios'

type ExportarLeadsButtonProps = {
  busquedaId: string
  rubro: string
}

export function ExportarLeadsButton({
  busquedaId,
  rubro,
}: ExportarLeadsButtonProps) {
  const { data: negocios = [] } = useNegociosDeBusqueda(busquedaId)
  const { filtros } = useParametrosTabla()
  const leads = soloLeads(filtrarNegocios(negocios, filtros))

  return (
    <Button
      disabled={leads.length === 0}
      onClick={() => exportarLeads(leads, rubro)}
    >
      <Download aria-hidden="true" />
      Exportar leads a CSV
    </Button>
  )
}
