import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ValidacionException } from '../validacion/validacion.exception.js';
import type { ErrorDto } from './error.dto.js';

const PREDETERMINADOS: Record<number, { code: string; message: string }> = {
  400: { code: 'VALIDACION', message: 'Revisa los datos enviados.' },
  404: { code: 'NO_ENCONTRADO', message: 'No se encontró el recurso.' },
  409: {
    code: 'CONFLICTO',
    message: 'La operación choca con datos existentes.',
  },
  500: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado.' },
};

const PRISMA_A_ESTADO: Record<string, number> = {
  P2002: 409,
  P2003: 409,
  P2025: 404,
};

type ErrorConCodigo = { name?: unknown; code?: unknown };

@Catch()
export class ErrorHttpFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorHttpFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const cuerpo = this.convertir(exception);
    respuesta.status(cuerpo.status).json(cuerpo);
  }

  private convertir(exception: unknown): ErrorDto {
    if (exception instanceof ValidacionException) {
      return {
        status: 400,
        code: 'VALIDACION',
        message: exception.message,
        ...(exception.fieldErrors && { fieldErrors: exception.fieldErrors }),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        this.logger.error(exception.stack ?? exception.message);
      }
      if (exception.errorCode) {
        return {
          status,
          code: exception.errorCode,
          message: exception.message,
        };
      }
      return this.predeterminado(status);
    }

    const conCodigo = (exception ?? {}) as ErrorConCodigo;
    if (
      conCodigo.name === 'PrismaClientKnownRequestError' &&
      typeof conCodigo.code === 'string' &&
      conCodigo.code in PRISMA_A_ESTADO
    ) {
      this.logger.warn(exception);
      return this.predeterminado(PRISMA_A_ESTADO[conCodigo.code]);
    }

    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception) : exception,
    );
    return this.predeterminado(HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private predeterminado(status: number): ErrorDto {
    const base =
      PREDETERMINADOS[status] ??
      (status >= 500
        ? PREDETERMINADOS[500]
        : {
            code: 'SOLICITUD_INVALIDA',
            message: 'La solicitud no es válida.',
          });
    return { status, ...base };
  }
}
