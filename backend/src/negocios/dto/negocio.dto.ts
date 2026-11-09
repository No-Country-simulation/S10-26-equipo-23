import { ApiProperty } from '@nestjs/swagger';
import { CiudadConPaisDto } from '../../common/dto/ciudad-con-pais.dto.js';
import { ContactoDto } from './contacto.dto.js';
import { LeadDetalleDto, LeadFilaDto } from './lead.dto.js';

export class ResenaDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, nullable: true })
  autor: string | null;

  @ApiProperty({ type: 'integer', nullable: true })
  rating: number | null;

  @ApiProperty({ type: String, nullable: true })
  fuente: string | null;

  @ApiProperty({ type: String, nullable: true })
  texto: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  respondida: boolean | null;

  @ApiProperty({ type: 'integer', nullable: true })
  meses_atras: number | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  fecha_aprox: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  fecha_extraccion: string | null;
}

export class BusquedaResumenDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  rubro: string;
}

class NegocioBaseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: string;

  @ApiProperty({ type: String })
  nombre: string;

  @ApiProperty({ type: String, nullable: true })
  direccion: string | null;

  @ApiProperty({ type: Number, nullable: true })
  rating: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  n_resenas: number | null;

  @ApiProperty({ type: Number, nullable: true })
  pct_negativas: number | null;

  @ApiProperty({ type: String, nullable: true })
  url_google_maps: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  fecha_extraccion: string | null;

  @ApiProperty({ type: () => CiudadConPaisDto })
  ciudad: CiudadConPaisDto;

  @ApiProperty({ type: () => [ContactoDto] })
  contactos: ContactoDto[];
}

export class NegocioFilaDto extends NegocioBaseDto {
  @ApiProperty({ type: () => LeadFilaDto, nullable: true })
  lead: LeadFilaDto | null;
}

export class NegocioDetalleDto extends NegocioBaseDto {
  @ApiProperty({ type: String })
  google_place_id: string;

  @ApiProperty({ type: 'integer', nullable: true })
  hist_5: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  hist_4: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  hist_3: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  hist_2: number | null;

  @ApiProperty({ type: 'integer', nullable: true })
  hist_1: number | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  primer_avistamiento: string | null;

  @ApiProperty({ type: () => BusquedaResumenDto })
  busqueda: BusquedaResumenDto;

  @ApiProperty({ type: () => [ResenaDto] })
  resenas: ResenaDto[];

  @ApiProperty({ type: () => LeadDetalleDto, nullable: true })
  lead: LeadDetalleDto | null;
}
