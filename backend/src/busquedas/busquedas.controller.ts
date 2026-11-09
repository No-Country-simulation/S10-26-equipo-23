import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ErrorDto } from '../common/filters/error.dto.js';
import { uuidSchema } from '../common/validacion/uuid.schema.js';
import { BusquedasService } from './busquedas.service.js';
import { BusquedaDto } from './dto/busqueda.dto.js';
import {
  createBusquedaSchema,
  type CreateBusquedaDto,
} from './dto/create-busqueda.dto.js';

@Controller('busquedas')
export class BusquedasController {
  constructor(private readonly busquedasService: BusquedasService) {}

  @Post()
  @ApiCreatedResponse({ type: BusquedaDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiConflictResponse({ type: ErrorDto })
  crear(
    @Body({ schema: createBusquedaSchema }) body: CreateBusquedaDto,
  ): Promise<BusquedaDto> {
    return this.busquedasService.crear(body);
  }

  @Get()
  @ApiOkResponse({ type: [BusquedaDto] })
  listar(): Promise<BusquedaDto[]> {
    return this.busquedasService.listar();
  }

  @Get(':id')
  @ApiOkResponse({ type: BusquedaDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  obtener(
    @Param('id', { schema: uuidSchema }) id: string,
  ): Promise<BusquedaDto> {
    return this.busquedasService.obtener(id);
  }
}
