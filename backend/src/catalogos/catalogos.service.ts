import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogosRepository,
  type Ciudad,
  type Pais,
} from './catalogos.repository.js';

const LIMITE_AUTOCOMPLETADO = 20;

@Injectable()
export class CatalogosService {
  constructor(private readonly repository: CatalogosRepository) {}

  listarPaises(): Promise<Pais[]> {
    return this.repository.listarPaises();
  }

  async buscarCiudades(paisId: string, nombre?: string): Promise<Ciudad[]> {
    await this.exigirPais(paisId);
    return this.repository.buscarCiudades(
      paisId,
      nombre ?? '',
      LIMITE_AUTOCOMPLETADO,
    );
  }

  async crearCiudad(paisId: string, nombre: string): Promise<Ciudad> {
    await this.exigirPais(paisId);
    const existente = await this.repository.buscarCiudadIgual(paisId, nombre);
    if (existente) {
      throw new ConflictException(
        `Ya existe la ciudad «${existente.nombre}». Elígela de la lista.`,
        { errorCode: 'CIUDAD_EXISTENTE' },
      );
    }
    return this.repository.crearCiudad(paisId, nombre);
  }

  private async exigirPais(paisId: string) {
    if (!(await this.repository.existePais(paisId))) {
      throw new NotFoundException('No se encontró el país.', {
        errorCode: 'PAIS_NO_ENCONTRADO',
      });
    }
  }
}
