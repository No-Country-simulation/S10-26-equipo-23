import { ApiProperty } from '@nestjs/swagger';

export class CiudadDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, format: 'uuid' })
  pais_id: string;

  @ApiProperty({ type: String })
  nombre: string;
}
