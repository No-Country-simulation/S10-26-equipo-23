import { z } from 'zod';

export const createCiudadSchema = z.strictObject({
  nombre: z
    .string()
    .trim()
    .normalize('NFC')
    .min(1, { error: 'Escribe el nombre de la ciudad.' })
    .max(100),
});

export type CreateCiudadDto = z.infer<typeof createCiudadSchema>;
