import { z } from 'zod'

export const TAMANO_MAXIMO_MB = 50

const archivoCsv = (faltante: string) =>
  z
    .instanceof(File, { error: faltante })
    .refine(
      (archivo) => archivo.name.toLowerCase().endsWith('.csv'),
      'Elige un archivo .csv',
    )
    .refine(
      (archivo) => archivo.size <= TAMANO_MAXIMO_MB * 1024 * 1024,
      `Debe pesar ${TAMANO_MAXIMO_MB} MB como máximo`,
    )

export const importarBusquedasSchema = z.object({
  negocios: archivoCsv('Elige el archivo de negocios'),
  fichas: archivoCsv('Elige el archivo de fichas'),
  resenas: archivoCsv('Elige el archivo de reseñas'),
  leads: archivoCsv('Elige el archivo de leads'),
})

export type ImportarBusquedasValores = z.infer<typeof importarBusquedasSchema>
