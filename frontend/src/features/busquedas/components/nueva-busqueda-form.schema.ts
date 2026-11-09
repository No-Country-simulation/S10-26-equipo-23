import { z } from 'zod'
import { FILTROS_POR_DEFECTO } from '@/utils/filtros'

const campoRating = z
  .string()
  .trim()
  .refine(
    (valor) =>
      valor === '' ||
      (/^\d(\.\d)?$/.test(valor) && Number(valor) >= 1 && Number(valor) <= 5),
    'Debe estar entre 1 y 5, con un decimal como máximo',
  )

const ciudadElegidaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  pais_nombre: z.string(),
})

export const nuevaBusquedaSchema = z
  .object({
    rubro: z
      .string()
      .trim()
      .min(1, 'Escribe el rubro')
      .max(100, 'Debe tener 100 caracteres como máximo'),
    ciudades: z.array(ciudadElegidaSchema).min(1, 'Agrega al menos una ciudad'),
    rating_minimo: campoRating,
    rating_maximo: campoRating,
    min_resenas: z
      .string()
      .trim()
      .regex(/^\d*$/, 'Debe ser un número entero, 0 o mayor'),
  })
  .superRefine((valores, contexto) => {
    const minimo = valores.rating_minimo
      ? Number(valores.rating_minimo)
      : FILTROS_POR_DEFECTO.rating_minimo
    const maximo = valores.rating_maximo
      ? Number(valores.rating_maximo)
      : FILTROS_POR_DEFECTO.rating_maximo
    if (minimo > maximo) {
      contexto.addIssue({
        code: 'custom',
        path: ['rating_minimo'],
        message: 'El mínimo no puede ser mayor que el máximo',
      })
    }
  })

export type CiudadElegida = z.infer<typeof ciudadElegidaSchema>
export type NuevaBusquedaValores = z.infer<typeof nuevaBusquedaSchema>
