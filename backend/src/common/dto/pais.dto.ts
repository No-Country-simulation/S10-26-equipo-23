import { ApiProperty } from '@nestjs/swagger';

export class PaisDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  nombre: string;
}
