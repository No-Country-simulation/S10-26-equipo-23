import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SCRAPER_DIR: z.string().min(1),
  SCRAPER_PYTHON: z.string().min(1),
  SCRAPER_NOTEBOOK: z.string().min(1).default('11_scraping_leads_maps.ipynb'),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODELO: z.string().min(1).default('gemini-3.5-flash-lite'),
  GEMINI_MODELO_RESPALDO: z.string().default('gemini-3.1-flash-lite'),
  CORREOS_REMITENTE: z.string().min(1).default('Equipo RepuSense'),
  CORREOS_EMPRESA: z.string().min(1).default('RepuSense'),
  CORREOS_OFERTA: z
    .string()
    .min(1)
    .default(
      'Ayudamos a negocios locales a gestionar su reputación online: responder reseñas, resolver los problemas que se repiten y mejorar su presencia en redes.',
    ),
  CORREOS_LLAMADA_ACCION: z
    .string()
    .min(1)
    .default('Agendar una llamada de 15 minutos esta semana'),
  CORREOS_TONO: z.string().optional(),
  CORREOS_FIRMA: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
