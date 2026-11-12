import { ApiProperty } from '@nestjs/swagger';

export const PRIORIDADES_LEAD = ['Alta', 'Media'] as const;
export const TENDENCIAS_LEAD = [
  'empeora',
  'estable',
  'mejora',
  'sin historial',
] as const;

export type PrioridadLead = (typeof PRIORIDADES_LEAD)[number];
export type TendenciaLead = (typeof TENDENCIAS_LEAD)[number];

export class ProblemaDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: 'integer' })
  orden: number;

  @ApiProperty({ type: String, nullable: true })
  problema: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  generado_en: Date | null;
}

export class CorreoDto {
  @ApiProperty({ type: String })
  asunto: string;

  @ApiProperty({
    type: String,
    description: 'Incluye la firma y la línea para darse de baja',
  })
  cuerpo: string;

  @ApiProperty({ type: String, format: 'date-time' })
  generado_en: Date;
}

class LeadBaseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({
    enum: PRIORIDADES_LEAD,
    enumName: 'PrioridadLead',
    nullable: true,
  })
  prioridad: PrioridadLead | null;

  @ApiProperty({ type: Number, nullable: true })
  percentil: number | null;

  @ApiProperty({
    enum: TENDENCIAS_LEAD,
    enumName: 'TendenciaLead',
    nullable: true,
  })
  tendencia: TendenciaLead | null;

  @ApiProperty({ type: Number, nullable: true })
  variacion_rating: number | null;

  @ApiProperty({
    type: () => CorreoDto,
    nullable: true,
    description: 'Correo de primer contacto redactado por Gemini',
  })
  correo: CorreoDto | null;
}

export class LeadFilaDto extends LeadBaseDto {
  @ApiProperty({
    type: [String],
    description: 'Problemas detectados por Gemini, en orden (hasta 3)',
  })
  problemas: string[];
}

export class LeadDetalleDto extends LeadBaseDto {
  @ApiProperty({ type: () => [ProblemaDto] })
  problemas: ProblemaDto[];
}
