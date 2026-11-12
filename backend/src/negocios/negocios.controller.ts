import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { ErrorDto } from '../common/filters/error.dto.js';
import { uuidSchema } from '../common/validacion/uuid.schema.js';
import { NegocioDetalleDto, NegocioFilaDto } from './dto/negocio.dto.js';
import { NegociosService } from './negocios.service.js';

@Controller()
export class NegociosController {
  constructor(private readonly negociosService: NegociosService) {}

  @Get('busquedas/:id/negocios')
  @ApiOkResponse({ type: [NegocioFilaDto] })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  listarPorBusqueda(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<NegocioFilaDto[]> {
    return this.negociosService.listarPorBusqueda(id);
  }

  @Get('negocios/:id')
  @ApiOkResponse({ type: NegocioDetalleDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  obtener(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<NegocioDetalleDto> {
    return this.negociosService.obtener(id);
  }

  @Post('negocios/:id/correo')
  @HttpCode(200)
  @ApiOkResponse({
    type: NegocioDetalleDto,
    description:
      'Redacta con Gemini el correo de primer contacto del lead (reemplaza el anterior) y devuelve el negocio actualizado. Puede tardar varios minutos.',
  })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  @ApiConflictResponse({ type: ErrorDto })
  @ApiServiceUnavailableResponse({ type: ErrorDto })
  redactarCorreo(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<NegocioDetalleDto> {
    return this.negociosService.redactarCorreo(id);
  }
}
