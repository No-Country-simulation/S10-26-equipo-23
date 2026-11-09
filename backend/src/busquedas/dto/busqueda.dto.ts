import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_BUSQUEDA,
  type EstadoBusqueda,
} from '../../common/busqueda.js';
import { CiudadConPaisDto } from '../../common/dto/ciudad-con-pais.dto.js';

export class UbicacionDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: () => CiudadConPaisDto })
  ciudad: CiudadConPaisDto;
}

export class ResultadosDto {
  @ApiProperty({ type: 'integer' })
  cantidad_negocios: number;

  @ApiProperty({ type: 'integer' })
  cantidad_leads: number;

  @ApiProperty({ type: 'integer' })
  cantidad_resenas: number;

  @ApiProperty({ type: 'integer' })
  cantidad_resenas_negativas: number;

  @ApiProperty({ type: String, format: 'date-time' })
  capturado_en: Date;
}

export class BusquedaDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  rubro: string;

  @ApiProperty({ type: Number, nullable: true })
  rating_minimo: number | null;

  @ApiProperty({ type: Number, nullable: true })
  rating_maximo: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  min_resenas: number | null;

  @ApiProperty({ enum: ESTADOS_BUSQUEDA, enumName: 'EstadoBusqueda' })
  estado: EstadoBusqueda;

  @ApiProperty({ type: String, format: 'date-time' })
  creada_en: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finalizada_en: Date | null;

  @ApiProperty({ type: String, nullable: true })
  error: string | null;

  @ApiProperty({ type: () => [UbicacionDto] })
  ubicaciones: UbicacionDto[];

  @ApiProperty({ type: () => ResultadosDto, nullable: true })
  resultados: ResultadosDto | null;
}
