import { useId } from 'react'
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
} from '@/components/ui/field'
import { useImportarBusquedas } from '@/features/busquedas/api/importar-busquedas'
import { ApiError } from '@/lib/api-error'
import { notificar } from '@/lib/notificar'
import type { ImportacionDto } from '@/types/api'
import {
  importarBusquedasSchema,
  type ImportarBusquedasValores,
} from './importar-busquedas-form.schema'
import { ZonaArchivoCsv } from './zona-archivo-csv'

type Campo = keyof ImportarBusquedasValores

const CAMPOS: { nombre: Campo; etiqueta: string; descripcion: string }[] = [
  {
    nombre: 'negocios',
    etiqueta: 'Negocios',
    descripcion: 'Se crea una búsqueda por cada rubro',
  },
  {
    nombre: 'fichas',
    etiqueta: 'Fichas',
    descripcion: 'Dirección, estrellas y contactos',
  },
  {
    nombre: 'resenas',
    etiqueta: 'Reseñas',
    descripcion: 'Reseñas de cada negocio',
  },
  {
    nombre: 'leads',
    etiqueta: 'Leads',
    descripcion: 'Prioridad y percentil',
  },
]

const formatoNumero = new Intl.NumberFormat('es')

function contar(cantidad: number, singular: string, plural: string) {
  return `${formatoNumero.format(cantidad)} ${cantidad === 1 ? singular : plural}`
}

function resumir(importacion: ImportacionDto) {
  const negocios = importacion.busquedas.reduce(
    (total, busqueda) => total + busqueda.cantidad_negocios,
    0,
  )
  const leads = importacion.busquedas.reduce(
    (total, busqueda) => total + busqueda.cantidad_leads,
    0,
  )
  const resumen = `Se están importando ${contar(importacion.busquedas.length, 'búsqueda', 'búsquedas')} con ${contar(negocios, 'negocio', 'negocios')} y ${contar(leads, 'lead', 'leads')}. Gemini detecta sus problemas y puede tardar unos minutos`
  return importacion.filas_invalidas > 0
    ? `${resumen}. Se omitieron ${contar(importacion.filas_invalidas, 'fila inválida', 'filas inválidas')}`
    : resumen
}

function esCampo(ruta: string): ruta is Campo {
  return CAMPOS.some((campo) => campo.nombre === ruta)
}

type ImportarBusquedasFormProps = {
  onImportada: () => void
}

export function ImportarBusquedasForm({
  onImportada,
}: ImportarBusquedasFormProps) {
  const id = useId()
  const importar = useImportarBusquedas()
  const {
    control,
    formState: { errors },
    handleSubmit,
    setError,
    trigger,
  } = useForm<ImportarBusquedasValores>({
    resolver: zodResolver(importarBusquedasSchema),
  })

  function enviar(valores: ImportarBusquedasValores) {
    importar.mutate(valores, {
      onSuccess: (importacion) => {
        notificar.exito(resumir(importacion))
        onImportada()
      },
      onError: (error) => {
        const campos =
          error instanceof ApiError
            ? Object.entries(error.fieldErrors ?? {}).filter(([ruta]) =>
                esCampo(ruta),
              )
            : []
        campos.forEach(([campo, mensaje]) =>
          setError(campo as Campo, { message: mensaje }),
        )
        if (campos.length === 0) {
          setError('root', { message: error.message })
        }
      },
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(enviar)}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={(evento) => evento.preventDefault()}
    >
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          {CAMPOS.map(({ nombre, etiqueta, descripcion }) => {
            const campoId = `${id}-${nombre}`
            return (
              <Controller
                key={nombre}
                control={control}
                name={nombre}
                render={({ field }) => (
                  <Field data-invalid={!!errors[nombre]}>
                    <FieldLabel htmlFor={campoId}>{etiqueta}</FieldLabel>
                    <ZonaArchivoCsv
                      id={campoId}
                      name={field.name}
                      archivo={field.value}
                      inputRef={field.ref}
                      invalido={!!errors[nombre]}
                      deshabilitado={importar.isPending}
                      descritoPor={`${campoId}-ayuda ${campoId}-error`}
                      onBlur={field.onBlur}
                      onElegir={(archivo) => {
                        field.onChange(archivo)
                        void trigger(nombre)
                      }}
                      onVariosArchivos={() =>
                        setError(nombre, {
                          message: 'Suelta un solo archivo',
                        })
                      }
                    />
                    <FieldDescription id={`${campoId}-ayuda`}>
                      {descripcion}
                    </FieldDescription>
                    <FieldError
                      id={`${campoId}-error`}
                      errors={[errors[nombre]]}
                    />
                  </Field>
                )}
              />
            )
          })}
        </div>

        <FieldError errors={[errors.root]} />

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={importar.isPending}
            >
              Cerrar
            </Button>
          </DialogClose>
          <Button type="submit" disabled={importar.isPending}>
            {importar.isPending
              ? 'Importando búsquedas…'
              : 'Importar búsquedas'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}
