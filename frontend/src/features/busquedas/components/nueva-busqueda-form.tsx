import { useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useCreateBusqueda } from '@/features/busquedas/api/create-busqueda'
import { useCreateCiudad } from '@/features/busquedas/api/create-ciudad'
import type { BusquedaDto, CreateBusquedaBody, PaisDto } from '@/types/api'
import { FILTROS_POR_DEFECTO } from '@/utils/filtros'
import { formatearRating } from '@/utils/formatos'
import { ApiError } from '@/lib/api-error'
import { notificar } from '@/lib/notificar'
import { CiudadCombobox } from './ciudad-combobox'
import { CiudadesElegidas } from './ciudades-elegidas'
import {
  nuevaBusquedaSchema,
  type CiudadElegida,
  type NuevaBusquedaValores,
} from './nueva-busqueda-form.schema'
import { PaisCombobox } from './pais-combobox'

function valoresIniciales(base: BusquedaDto | null): NuevaBusquedaValores {
  return {
    rubro: base?.rubro ?? '',
    ciudades:
      base?.ubicaciones.map(({ ciudad }) => ({
        id: ciudad.id,
        nombre: ciudad.nombre,
        pais_nombre: ciudad.pais.nombre,
      })) ?? [],
    rating_minimo: base?.rating_minimo?.toString() ?? '',
    rating_maximo: base?.rating_maximo?.toString() ?? '',
    min_resenas: base?.min_resenas?.toString() ?? '',
  }
}

const CAMPOS_DIRECTOS = [
  'rubro',
  'rating_minimo',
  'rating_maximo',
  'min_resenas',
] as const

function campoDelFormulario(ruta: string): keyof NuevaBusquedaValores | null {
  if (ruta === 'ubicaciones' || ruta.startsWith('ubicaciones.')) {
    return 'ciudades'
  }
  return CAMPOS_DIRECTOS.find((campo) => campo === ruta) ?? null
}

function numeroOpcional(valor: string) {
  return valor === '' ? null : Number(valor)
}

function aCuerpo(valores: NuevaBusquedaValores): CreateBusquedaBody {
  return {
    rubro: valores.rubro,
    ubicaciones: valores.ciudades.map(({ id }) => ({ ciudad_id: id })),
    rating_minimo: numeroOpcional(valores.rating_minimo),
    rating_maximo: numeroOpcional(valores.rating_maximo),
    min_resenas: numeroOpcional(valores.min_resenas),
  }
}

type NuevaBusquedaFormProps = {
  base: BusquedaDto | null
  contenedorPopups: HTMLElement | null
  onCreada: () => void
}

export function NuevaBusquedaForm({
  base,
  contenedorPopups,
  onCreada,
}: NuevaBusquedaFormProps) {
  const id = useId()
  const [pais, setPais] = useState<PaisDto | null>(null)
  const crearBusqueda = useCreateBusqueda()
  const crearCiudad = useCreateCiudad()
  const {
    clearErrors,
    control,
    formState: { errors },
    getValues,
    handleSubmit,
    register,
    setError,
    setValue,
  } = useForm<NuevaBusquedaValores>({
    resolver: zodResolver(nuevaBusquedaSchema),
    defaultValues: valoresIniciales(base),
  })

  const ids = {
    rubro: `${id}-rubro`,
    pais: `${id}-pais`,
    ciudad: `${id}-ciudad`,
    rating_minimo: `${id}-rating-minimo`,
    rating_maximo: `${id}-rating-maximo`,
    min_resenas: `${id}-min-resenas`,
  }

  function sumarCiudad(ciudad: CiudadElegida) {
    setValue('ciudades', [...getValues('ciudades'), ciudad])
    clearErrors('ciudades')
  }

  function agregarCiudad(nombre: string) {
    if (!pais) return
    crearCiudad.mutate(
      { paisId: pais.id, body: { nombre } },
      {
        onSuccess: (ciudad) =>
          sumarCiudad({
            id: ciudad.id,
            nombre: ciudad.nombre,
            pais_nombre: pais.nombre,
          }),
        onError: (error) =>
          setError('ciudades', {
            message:
              (error instanceof ApiError && error.fieldErrors?.nombre) ||
              error.message,
          }),
      },
    )
  }

  function enviar(valores: NuevaBusquedaValores) {
    crearBusqueda.mutate(aCuerpo(valores), {
      onSuccess: () => {
        notificar.exito('Búsqueda creada')
        onCreada()
      },
      onError: (error) => {
        const campos =
          error instanceof ApiError
            ? Object.entries(error.fieldErrors ?? {}).flatMap(
                ([ruta, mensaje]) => {
                  const campo = campoDelFormulario(ruta)
                  return campo ? [[campo, mensaje] as const] : []
                },
              )
            : []
        campos.forEach(([campo, mensaje]) =>
          setError(campo, { message: mensaje }),
        )
        if (campos.length === 0) {
          setError('root', { message: error.message })
        }
      },
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit(enviar)}>
      <FieldGroup>
        <Field data-invalid={!!errors.rubro}>
          <FieldLabel htmlFor={ids.rubro}>Rubro</FieldLabel>
          <Input
            id={ids.rubro}
            placeholder="Por ejemplo, hoteles"
            aria-invalid={!!errors.rubro}
            aria-describedby={`${ids.rubro}-error`}
            {...register('rubro')}
          />
          <FieldError id={`${ids.rubro}-error`} errors={[errors.rubro]} />
        </Field>

        <Controller
          control={control}
          name="ciudades"
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor={ids.pais}>País</FieldLabel>
                  <PaisCombobox
                    id={ids.pais}
                    valor={pais}
                    onCambio={setPais}
                    contenedor={contenedorPopups}
                  />
                </Field>
                <Field data-invalid={!!errors.ciudades}>
                  <FieldLabel htmlFor={ids.ciudad}>Ciudad</FieldLabel>
                  <CiudadCombobox
                    key={pais?.id ?? 'sin-pais'}
                    id={ids.ciudad}
                    pais={pais}
                    elegidas={field.value}
                    onElegir={sumarCiudad}
                    onAgregar={agregarCiudad}
                    agregando={crearCiudad.isPending}
                    contenedor={contenedorPopups}
                    invalido={!!errors.ciudades}
                    descritoPor={`${ids.ciudad}-ayuda ${ids.ciudad}-error`}
                  />
                </Field>
              </div>
              <FieldDescription id={`${ids.ciudad}-ayuda`}>
                Puedes sumar ciudades de varios países <br />
                Cuantas más ciudades, más tardará la búsqueda
              </FieldDescription>
              <FieldError
                id={`${ids.ciudad}-error`}
                errors={[errors.ciudades]}
              />
              <CiudadesElegidas
                ciudades={field.value}
                onQuitar={(ciudadId) =>
                  field.onChange(
                    field.value.filter((ciudad) => ciudad.id !== ciudadId),
                  )
                }
              />
            </div>
          )}
        />

        <FieldSet>
          <FieldLegend variant="label">Filtros (opcionales)</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field data-invalid={!!errors.rating_minimo}>
              <FieldLabel htmlFor={ids.rating_minimo}>Rating mínimo</FieldLabel>
              <Input
                id={ids.rating_minimo}
                type="number"
                min={1}
                max={5}
                step={0.1}
                aria-invalid={!!errors.rating_minimo}
                aria-describedby={`${ids.rating_minimo}-ayuda ${ids.rating_minimo}-error`}
                {...register('rating_minimo')}
              />
              <FieldDescription id={`${ids.rating_minimo}-ayuda`}>
                Si lo dejas vacío:{' '}
                {formatearRating(FILTROS_POR_DEFECTO.rating_minimo)}
              </FieldDescription>
              <FieldError
                id={`${ids.rating_minimo}-error`}
                errors={[errors.rating_minimo]}
              />
            </Field>
            <Field data-invalid={!!errors.rating_maximo}>
              <FieldLabel htmlFor={ids.rating_maximo}>Rating máximo</FieldLabel>
              <Input
                id={ids.rating_maximo}
                type="number"
                min={1}
                max={5}
                step={0.1}
                aria-invalid={!!errors.rating_maximo}
                aria-describedby={`${ids.rating_maximo}-ayuda ${ids.rating_maximo}-error`}
                {...register('rating_maximo', { deps: ['rating_minimo'] })}
              />
              <FieldDescription id={`${ids.rating_maximo}-ayuda`}>
                Si lo dejas vacío:{' '}
                {formatearRating(FILTROS_POR_DEFECTO.rating_maximo)}
              </FieldDescription>
              <FieldError
                id={`${ids.rating_maximo}-error`}
                errors={[errors.rating_maximo]}
              />
            </Field>
            <Field data-invalid={!!errors.min_resenas}>
              <FieldLabel htmlFor={ids.min_resenas}>
                Más de (reseñas)
              </FieldLabel>
              <Input
                id={ids.min_resenas}
                type="number"
                min={0}
                step={1}
                aria-invalid={!!errors.min_resenas}
                aria-describedby={`${ids.min_resenas}-ayuda ${ids.min_resenas}-error`}
                {...register('min_resenas')}
              />
              <FieldDescription id={`${ids.min_resenas}-ayuda`}>
                Si lo dejas vacío: {FILTROS_POR_DEFECTO.min_resenas}
              </FieldDescription>
              <FieldError
                id={`${ids.min_resenas}-error`}
                errors={[errors.min_resenas]}
              />
            </Field>
          </div>
        </FieldSet>

        <FieldError errors={[errors.root]} />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cerrar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={crearBusqueda.isPending || crearCiudad.isPending}
          >
            {crearBusqueda.isPending ? 'Creando búsqueda…' : 'Crear búsqueda'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
