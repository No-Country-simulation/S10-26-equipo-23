import type { ResultadosDto } from '@/types/api'

export function BusquedaResumen({ resultados }: { resultados: ResultadosDto }) {
  const datos = [
    { nombre: 'Negocios', valor: resultados.cantidad_negocios },
    { nombre: 'Leads', valor: resultados.cantidad_leads },
    { nombre: 'Reseñas', valor: resultados.cantidad_resenas },
    {
      nombre: 'Reseñas negativas',
      valor: resultados.cantidad_resenas_negativas,
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {datos.map(({ nombre, valor }) => (
        <div
          key={nombre}
          className="flex flex-col gap-1 rounded-xl border bg-card px-4 py-3"
        >
          <dt className="text-sm text-muted-foreground">{nombre}</dt>
          <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}
