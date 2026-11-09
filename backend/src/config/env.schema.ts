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
});

export type Env = z.infer<typeof envSchema>;
