import { z } from 'zod';

export const buscarCiudadesSchema = z.strictObject({
  nombre: z.string().trim().max(100).optional(),
});

export type BuscarCiudadesDto = z.infer<typeof buscarCiudadesSchema>;
