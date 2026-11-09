import { Injectable, NotFoundException } from '@nestjs/common';
import { BusquedasService } from '../busquedas/busquedas.service.js';
import {
  NegociosRepository,
  type NegocioDetalle,
  type NegocioFila,
} from './negocios.repository.js';

@Injectable()
export class NegociosService {
  constructor(
    private readonly repository: NegociosRepository,
    private readonly busquedas: BusquedasService,
  ) {}

  async listarPorBusqueda(busquedaId: string): Promise<NegocioFila[]> {
    const busqueda = await this.busquedas.obtener(busquedaId);
    if (busqueda.estado !== 'completada') {
      return [];
    }
    return this.repository.listarPorBusqueda(busquedaId);
  }

  async obtener(id: string): Promise<NegocioDetalle> {
    const negocio = await this.repository.obtener(id);
    if (!negocio) {
      throw new NotFoundException('No se encontró el negocio.', {
        errorCode: 'NEGOCIO_NO_ENCONTRADO',
      });
    }
    return negocio;
  }
}
