import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ErrorDto } from '../common/filters/error.dto.js';
import { CAMPOS_IMPORTACION } from '../importador/dto/create-importacion.dto.js';
import { ImportacionDto } from '../importador/dto/importacion.dto.js';
import { ScraperService } from './scraper.service.js';

const TAMANO_MAXIMO_BYTES = 50 * 1024 * 1024;

@Controller('importaciones')
export class ImportacionesController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      CAMPOS_IMPORTACION.map((name) => ({ name, maxCount: 1 })),
      { limits: { fileSize: TAMANO_MAXIMO_BYTES } },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [...CAMPOS_IMPORTACION],
      properties: Object.fromEntries(
        CAMPOS_IMPORTACION.map((campo) => [
          campo,
          { type: 'string', format: 'binary' },
        ]),
      ),
    },
  })
  @ApiCreatedResponse({ type: ImportacionDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiConflictResponse({ type: ErrorDto })
  importar(@UploadedFiles() archivos: unknown): Promise<ImportacionDto> {
    return this.scraperService.importarArchivos(archivos);
  }
}
