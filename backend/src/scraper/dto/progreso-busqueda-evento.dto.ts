import { ApiProperty } from '@nestjs/swagger';
import {
  ESTADOS_BUSQUEDA,
  type EstadoBusqueda,
} from '../../common/busqueda.js';

export class ProgresoDto {
  @ApiProperty({ type: 'integer' })
  sesion: number;

  @ApiProperty({ enum: [1, 2, 3, 4], enumName: 'FaseScraper' })
  fase: 1 | 2 | 3 | 4;

  @ApiProperty({ type: 'integer' })
  hechas: number;

  @ApiProperty({ type: 'integer' })
  total: number;
}

export class ProgresoBusquedaEventoDto {
  @ApiProperty({ enum: ESTADOS_BUSQUEDA, enumName: 'EstadoBusqueda' })
  estado: EstadoBusqueda;

  @ApiProperty({ type: () => ProgresoDto, nullable: true })
  progreso: ProgresoDto | null;
}
