import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { filtrosEfectivos } from '../common/busqueda.js';
import { ValidacionException } from '../common/validacion/validacion.exception.js';
import { ScraperService } from '../scraper/scraper.service.js';
import { BusquedasRepository, type Busqueda } from './busquedas.repository.js';
import type { CreateBusquedaDto } from './dto/create-busqueda.dto.js';

const MENSAJE_CAMPOS = 'Revisa los datos marcados.';

@Injectable()
export class BusquedasService {
  constructor(
    private readonly repository: BusquedasRepository,
    private readonly scraper: ScraperService,
  ) {}

  listar(): Promise<Busqueda[]> {
    return this.repository.listar();
  }

  async obtener(id: string): Promise<Busqueda> {
    const busqueda = await this.repository.obtener(id);
    if (!busqueda) {
      throw new NotFoundException('No se encontró la búsqueda.', {
        errorCode: 'BUSQUEDA_NO_ENCONTRADA',
      });
    }
    return busqueda;
  }

  async crear(dto: CreateBusquedaDto): Promise<Busqueda> {
    const filtros = {
      rating_minimo: dto.rating_minimo ?? null,
      rating_maximo: dto.rating_maximo ?? null,
      min_resenas: dto.min_resenas ?? null,
    };
    const efectivos = filtrosEfectivos(filtros);
    if (efectivos.rating_minimo > efectivos.rating_maximo) {
      throw new ValidacionException(MENSAJE_CAMPOS, {
        rating_minimo: `No puede ser mayor que el rating máximo (${efectivos.rating_maximo.toLocaleString('es')}).`,
      });
    }

    const ciudadIds = dto.ubicaciones.map((ubicacion) => ubicacion.ciudad_id);
    const existentes = await this.repository.ciudadesExistentes(ciudadIds);
    const inexistentes: Record<string, string> = {};
    ciudadIds.forEach((id, indice) => {
      if (!existentes.has(id)) {
        inexistentes[`ubicaciones.${indice}.ciudad_id`] =
          'La ciudad no existe.';
      }
    });
    if (Object.keys(inexistentes).length > 0) {
      throw new ValidacionException(MENSAJE_CAMPOS, inexistentes);
    }

    if (await this.repository.hayEnCurso()) {
      throw new ConflictException(
        'Ya hay una búsqueda en curso. Espera a que termine o cancélala.',
        { errorCode: 'BUSQUEDA_EN_CURSO' },
      );
    }

    const busqueda = await this.repository.crear({
      ...filtros,
      rubro: dto.rubro,
      ciudadIds,
    });
    this.scraper.lanzar(busqueda);
    return busqueda;
  }
}
