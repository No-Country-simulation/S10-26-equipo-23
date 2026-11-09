import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ErrorHttpFilter } from './common/filters/error-http.filter.js';
import { envSchema, type Env } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { CatalogosModule } from './catalogos/catalogos.module.js';
import { BusquedasModule } from './busquedas/busquedas.module.js';
import { ScraperModule } from './scraper/scraper.module.js';
import { ImportadorModule } from './importador/importador.module.js';
import { NegociosModule } from './negocios/negocios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport: { target: 'pino-pretty' },
        },
      }),
    }),
    DatabaseModule,
    CatalogosModule,
    BusquedasModule,
    ScraperModule,
    ImportadorModule,
    NegociosModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ErrorHttpFilter }],
})
export class AppModule {}
