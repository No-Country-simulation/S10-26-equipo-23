import { ApiProperty } from '@nestjs/swagger';

export const TIPOS_CONTACTO = [
  'telefono',
  'email',
  'web',
  'facebook',
  'instagram',
  'tiktok',
  'x',
  'youtube',
  'linkedin',
] as const;

export const FUENTES_CONTACTO = ['google_maps', 'web_negocio'] as const;

export type TipoContacto = (typeof TIPOS_CONTACTO)[number];
export type FuenteContacto = (typeof FUENTES_CONTACTO)[number];

export class ContactoDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ enum: TIPOS_CONTACTO, enumName: 'TipoContacto' })
  tipo: TipoContacto;

  @ApiProperty({ type: String, nullable: true })
  subtipo: string | null;

  @ApiProperty({ type: String })
  valor: string;

  @ApiProperty({ enum: FUENTES_CONTACTO, enumName: 'FuenteContacto' })
  fuente: FuenteContacto;
}
