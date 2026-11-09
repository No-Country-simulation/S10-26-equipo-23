import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
}
