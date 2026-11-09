import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { PaisDto } from '../common/dto/pais.dto.js';
import { ErrorDto } from '../common/filters/error.dto.js';
import { uuidSchema } from '../common/validacion/uuid.schema.js';
import { CatalogosService } from './catalogos.service.js';
import {
  buscarCiudadesSchema,
  type BuscarCiudadesDto,
} from './dto/buscar-ciudades.dto.js';
import { CiudadDto } from './dto/ciudad.dto.js';
import {
  createCiudadSchema,
  type CreateCiudadDto,
} from './dto/create-ciudad.dto.js';

@Controller('paises')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get()
  @ApiOkResponse({ type: [PaisDto] })
  listarPaises(): Promise<PaisDto[]> {
    return this.catalogosService.listarPaises();
  }

  @Get(':id/ciudades')
  @ApiOkResponse({ type: [CiudadDto] })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  buscarCiudades(
    @Param('id', { schema: uuidSchema }) id: string,
    @Query({ schema: buscarCiudadesSchema }) query: BuscarCiudadesDto,
  ): Promise<CiudadDto[]> {
    return this.catalogosService.buscarCiudades(id, query.nombre);
  }

  @Post(':id/ciudades')
  @ApiCreatedResponse({ type: CiudadDto })
  @ApiBadRequestResponse({ type: ErrorDto })
  @ApiNotFoundResponse({ type: ErrorDto })
  @ApiConflictResponse({ type: ErrorDto })
  crearCiudad(
    @Param('id', { schema: uuidSchema }) id: string,
    @Body({ schema: createCiudadSchema }) body: CreateCiudadDto,
  ): Promise<CiudadDto> {
    return this.catalogosService.crearCiudad(id, body.nombre);
  }
}
