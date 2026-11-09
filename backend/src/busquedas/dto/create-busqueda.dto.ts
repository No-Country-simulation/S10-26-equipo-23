import { z } from 'zod';

const MENSAJE_RATING = 'Usa un número de 1 a 5 con un decimal como máximo.';

const rating = z
  .number({ error: MENSAJE_RATING })
  .min(1, { error: MENSAJE_RATING })
  .max(5, { error: MENSAJE_RATING })
  .multipleOf(0.1, { error: MENSAJE_RATING })
  .nullable()
  .optional();

export const createBusquedaSchema = z.strictObject({
  rubro: z
    .string()
    .trim()
    .normalize('NFC')
    .min(1, { error: 'Escribe el rubro.' })
    .max(100),
  ubicaciones: z
    .array(z.strictObject({ ciudad_id: z.uuid({ error: 'Ciudad inválida.' }) }))
    .min(1, { error: 'Elige al menos una ciudad.' })
    .superRefine((ubicaciones, ctx) => {
      const vistas = new Set<string>();
      ubicaciones.forEach((ubicacion, indice) => {
        if (vistas.has(ubicacion.ciudad_id)) {
          ctx.addIssue({
            code: 'custom',
            message: 'Esta ciudad está repetida.',
            path: [indice, 'ciudad_id'],
          });
        }
        vistas.add(ubicacion.ciudad_id);
      });
    }),
  rating_minimo: rating,
  rating_maximo: rating,
  min_resenas: z
    .number({ error: 'Usa un número entero mayor o igual a 0.' })
    .int({ error: 'Usa un número entero mayor o igual a 0.' })
    .min(0, { error: 'Usa un número entero mayor o igual a 0.' })
    .nullable()
    .optional(),
});

export type CreateBusquedaDto = z.infer<typeof createBusquedaSchema>;
