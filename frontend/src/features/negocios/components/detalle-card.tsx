import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DetalleCardProps = {
  titulo: string
  children: ReactNode
}

export function DetalleCard({ titulo, children }: DetalleCardProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>
          <h2 className="text-base font-semibold">{titulo}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">{children}</CardContent>
    </Card>
  )
}
