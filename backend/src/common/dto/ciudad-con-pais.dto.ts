import { ApiProperty } from '@nestjs/swagger';
import { PaisDto } from './pais.dto.js';

export class CiudadConPaisDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  nombre: string;

  @ApiProperty({ type: () => PaisDto })
  pais: PaisDto;
}
