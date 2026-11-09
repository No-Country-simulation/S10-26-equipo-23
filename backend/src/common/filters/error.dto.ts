import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ type: Number })
  status: number;

  @ApiProperty({ type: String })
  code: string;

  @ApiProperty({ type: String })
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  fieldErrors?: Record<string, string>;
}
