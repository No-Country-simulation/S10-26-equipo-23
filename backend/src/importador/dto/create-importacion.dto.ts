import { z } from 'zod';

export const CAMPOS_IMPORTACION = [
  'negocios',
  'fichas',
  'resenas',
  'leads',
] as const;

const archivo = (vacio: string) =>
  z
    .array(z.object({ buffer: z.instanceof(Buffer), size: z.number() }), {
      error: vacio,
    })
    .length(1)
    .refine((archivos) => archivos[0].size > 0, {
      error: 'El archivo está vacío.',
    })
    .transform((archivos) => archivos[0].buffer);

export const createImportacionSchema = z.strictObject({
  negocios: archivo('Elige el archivo de negocios.'),
  fichas: archivo('Elige el archivo de fichas.'),
  resenas: archivo('Elige el archivo de reseñas.'),
  leads: archivo('Elige el archivo de leads.'),
});

export type CreateImportacionDto = z.infer<typeof createImportacionSchema>;
