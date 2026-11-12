import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BusquedasService } from '../busquedas/busquedas.service.js';
import { GeneradorCorreosService } from '../scraper/generador-correos.service.js';
import { ScriptGeminiError } from '../scraper/script-gemini.service.js';
import {
  NegociosRepository,
  type NegocioDetalle,
  type NegocioFila,
} from './negocios.repository.js';

const MENSAJE_SIN_CORREO =
  'Gemini no redactó el correo de este lead. Intenta más tarde.';

@Injectable()
export class NegociosService implements OnModuleDestroy {
  private readonly redactando = new Map<string, AbortController>();

  constructor(
    private readonly repository: NegociosRepository,
    private readonly busquedas: BusquedasService,
    private readonly generador: GeneradorCorreosService,
  ) {}

  onModuleDestroy() {
    for (const controlador of this.redactando.values()) {
      controlador.abort();
    }
  }

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

  async redactarCorreo(id: string): Promise<NegocioDetalle> {
    const datos = await this.repository.obtenerParaCorreo(id);
    if (!datos) {
      throw new NotFoundException('No se encontró el negocio.', {
        errorCode: 'NEGOCIO_NO_ENCONTRADO',
      });
    }
    const { lead_id: leadId, negocio } = datos;
    if (leadId === null) {
      throw new ConflictException(
        'Solo se redactan correos para los negocios que son lead.',
        { errorCode: 'NEGOCIO_NO_ES_LEAD' },
      );
    }
    if (this.redactando.has(id)) {
      throw new ConflictException(
        'Ya se está redactando el correo de este lead.',
        { errorCode: 'CORREO_EN_CURSO' },
      );
    }

    const controlador = new AbortController();
    this.redactando.set(id, controlador);
    try {
      const correos = await this.generador.generar([negocio], {
        signal: controlador.signal,
        alAvanzar: () => undefined,
      });
      const correo = correos.get(negocio.place_id);
      if (!correo) {
        throw new ScriptGeminiError(MENSAJE_SIN_CORREO);
      }
      await this.repository.guardarCorreo(leadId, correo);
    } catch (error) {
      if (error instanceof ScriptGeminiError) {
        throw new ServiceUnavailableException(error.message, {
          errorCode: 'GEMINI_NO_DISPONIBLE',
        });
      }
      throw error;
    } finally {
      this.redactando.delete(id);
    }
    return this.obtener(id);
  }
}
