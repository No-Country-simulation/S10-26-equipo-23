import {
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Sse,
  type MessageEvent,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';
import { concat, map, of, takeWhile, type Observable } from 'rxjs';
import { BusquedaDto } from '../busquedas/dto/busqueda.dto.js';
import { ErrorDto } from '../common/filters/error.dto.js';
import { uuidSchema } from '../common/validacion/uuid.schema.js';
import { ProgresoBusquedaEventoDto } from './dto/progreso-busqueda-evento.dto.js';
import { ScraperService } from './scraper.service.js';

@Controller('busquedas')
@ApiExtraModels(ProgresoBusquedaEventoDto)
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post(':id/cancelar')
  @HttpCode(200)
  @ApiOkResponse({ type: BusquedaDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  @ApiConflictResponse({ type: ErrorDto })
  cancelar(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<BusquedaDto> {
    return this.scraperService.cancelar(id);
  }

  @Sse(':id/progreso')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description:
      'Cada evento lleva en data un ProgresoBusquedaEventoDto. Se cierra al llegar a un estado final.',
    schema: { $ref: getSchemaPath(ProgresoBusquedaEventoDto) },
  })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  async progreso(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<Observable<MessageEvent>> {
    const busqueda = await this.scraperService.exigir(id);
    const actual: ProgresoBusquedaEventoDto = {
      estado: busqueda.estado,
      progreso: this.scraperService.progresoActual(id),
    };
    const eventos =
      busqueda.estado === 'en_curso'
        ? concat(
            of(actual),
            this.scraperService.cambiosDe(id).pipe(
              takeWhile((evento) => evento.estado === 'en_curso', true),
              map(({ estado, progreso }): ProgresoBusquedaEventoDto => ({
                estado,
                progreso,
              })),
            ),
          )
        : of(actual);
    return eventos.pipe(map((data) => ({ data })));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  eliminar(@Param('id', { schema: uuidSchema }) id: string): Promise<void> {
    return this.scraperService.eliminar(id);
  }
}
