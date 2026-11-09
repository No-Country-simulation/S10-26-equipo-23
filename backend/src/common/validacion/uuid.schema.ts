import { z } from 'zod';

export const uuidSchema = z.uuid({ error: 'El id no es un UUID válido.' });
