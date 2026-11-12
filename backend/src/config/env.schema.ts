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
});

export type Env = z.infer<typeof envSchema>;
