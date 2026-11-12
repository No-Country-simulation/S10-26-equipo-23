import { ApiProperty } from '@nestjs/swagger';

export class BusquedaImportadaDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  rubro: string;

  @ApiProperty({ type: 'integer' })
  cantidad_ubicaciones: number;

  @ApiProperty({ type: 'integer' })
  cantidad_negocios: number;

  @ApiProperty({ type: 'integer' })
  cantidad_leads: number;

  @ApiProperty({ type: 'integer' })
  cantidad_resenas: number;

  @ApiProperty({ type: 'integer' })
  cantidad_contactos: number;
}

export class ImportacionDto {
  @ApiProperty({ type: () => [BusquedaImportadaDto] })
  busquedas: BusquedaImportadaDto[];

  @ApiProperty({ type: 'integer' })
  ciudades_creadas: number;

  @ApiProperty({ type: 'integer' })
  filas_invalidas: number;
}
