import { useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { busquedasKeys } from '@/features/busquedas/api/query-keys'
import type { BusquedaDto } from '@/types/api'
import { NuevaBusquedaForm } from './nueva-busqueda-form'

type NuevaBusquedaDialogProps = {
  abierto: boolean
  base: BusquedaDto | null
  onAbiertoChange: (abierto: boolean) => void
  onCreada: () => void
}

export function NuevaBusquedaDialog({
  abierto,
  base,
  onAbiertoChange,
  onCreada,
}: NuevaBusquedaDialogProps) {
  const [contenedorPopups, setContenedorPopups] =
    useState<HTMLDivElement | null>(null)
  const creando = useIsMutating({ mutationKey: busquedasKeys.crear() }) > 0

  return (
    <Dialog
      open={abierto}
      onOpenChange={(abrir) => {
        if (!creando) onAbiertoChange(abrir)
      }}
    >
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-xl">
        <div ref={setContenedorPopups} className="absolute top-0 left-0" />

        <DialogHeader>
          <DialogTitle>Nueva búsqueda</DialogTitle>
          <DialogDescription>
            {base
              ? 'Datos de la búsqueda anterior. Ajusta lo que quieras antes de crearla'
              : 'Elige el rubro y las ciudades donde buscar negocios con mala reputación'}
          </DialogDescription>
        </DialogHeader>
        <NuevaBusquedaForm
          base={base}
          contenedorPopups={contenedorPopups}
          onCreada={() => {
            onAbiertoChange(false)
            onCreada()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
