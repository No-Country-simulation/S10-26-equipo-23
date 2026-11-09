import {
  Logger as NestLogger,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { z } from 'zod';
import { AppModule } from './app.module.js';
import { exceptionFactory } from './common/validacion/exception-factory.js';
import type { Env } from './config/env.schema.js';

z.config(z.locales.es());

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new StandardSchemaValidationPipe({ exceptionFactory }));
  app.enableShutdownHooks();

  const documento = new DocumentBuilder()
    .setTitle('RepuSense API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, documento),
  );

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  new NestLogger('Bootstrap').log(`Backend escuchando en el puerto ${port}`);
}
await bootstrap();
