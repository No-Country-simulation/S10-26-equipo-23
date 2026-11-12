import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Papa from 'papaparse';
import type { CorreoGenerado, NegocioParaCorreo } from '../common/correos.js';
import type { Env } from '../config/env.schema.js';
import {
  ScriptGeminiError,
  ScriptGeminiService,
  type OpcionesScript,
  type ScriptGemini,
} from './script-gemini.service.js';

const SCRIPT: ScriptGemini = {
  carpeta: 'genera mails',
  archivo: 'GENERA_MAILS.py',
  entradas: 'GENERA_MAILS_inputs.json',
  tmp: 'correos',
  tarea: 'la redacción de correos',
  sinRespuesta:
    'Gemini no redactó los correos de todos los leads. Intenta más tarde.',
};
const NEGOCIOS_POR_GRUPO = 10;
const COLUMNAS = [
  'place_id',
  'nombre',
  'ciudad',
  'pais',
  'descripcion',
  'n_resenas',
  'rating',
  'problemas',
  'email',
];

@Injectable()
export class GeneradorCorreosService {
  private readonly logger = new Logger(GeneradorCorreosService.name);

  constructor(
    private readonly scripts: ScriptGeminiService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async generar(
    negocios: NegocioParaCorreo[],
    opciones: OpcionesScript,
    { tolerante = false }: { tolerante?: boolean } = {},
  ): Promise<Map<string, CorreoGenerado>> {
    if (negocios.length === 0) {
      return new Map();
    }
    const esperados = new Set(negocios.map((negocio) => negocio.place_id));
    const grupos = Math.ceil(negocios.length / NEGOCIOS_POR_GRUPO);

    const inicio = Date.now();
    this.logger.log(
      `Redacción de correos iniciada: ${negocios.length} lead(s), ${grupos} grupo(s)`,
    );
    const correos = await this.scripts.ejecutar(
      SCRIPT,
      {
        grupos,
        preparar: async (carpeta) => {
          const rutaNegocios = path.join(carpeta, 'negocios.csv');
          await writeFile(
            rutaNegocios,
            Papa.unparse(
              negocios.map((negocio) => ({
                ...negocio,
                problemas: JSON.stringify(negocio.problemas),
              })),
              { columns: COLUMNAS },
            ),
            'utf8',
          );
          return {
            RUTA_NEGOCIOS: rutaNegocios,
            RUTA_SALIDA: path.join(carpeta, 'correos.csv'),
            TAMANO_LOTE: NEGOCIOS_POR_GRUPO,
            ...this.remitente(),
          };
        },
        leer: (carpeta) =>
          this.leerSalida(path.join(carpeta, 'correos.csv'), esperados),
        ...(tolerante && {
          rescatar: (carpeta, error) =>
            this.rescatar(path.join(carpeta, 'correos.csv'), esperados, error),
        }),
      },
      opciones,
    );
    this.logger.log(
      `Redacción de correos terminada: ${correos.size} lead(s) en ${Math.round((Date.now() - inicio) / 1000)} s`,
    );
    return correos;
  }

  private remitente() {
    const tono = this.config.get('CORREOS_TONO', { infer: true });
    const firma = this.config.get('CORREOS_FIRMA', { infer: true });
    return {
      REMITENTE: this.config.get('CORREOS_REMITENTE', { infer: true }),
      EMPRESA: this.config.get('CORREOS_EMPRESA', { infer: true }),
      OFERTA: this.config.get('CORREOS_OFERTA', { infer: true }),
      LLAMADA_ACCION: this.config.get('CORREOS_LLAMADA_ACCION', {
        infer: true,
      }),
      ...(tono && { TONO: tono }),
      ...(firma && { FIRMA: firma.replaceAll('\\n', '\n') }),
    };
  }

  private async rescatar(
    ruta: string,
    esperados: Set<string>,
    error: ScriptGeminiError,
  ) {
    this.logger.warn(
      `La redacción de correos se interrumpió: ${error.message} Se conservan los correos ya redactados.`,
    );
    try {
      return await this.leerSalida(ruta, esperados);
    } catch {
      return new Map<string, CorreoGenerado>();
    }
  }

  private async leerSalida(ruta: string, esperados: Set<string>) {
    const filas = await this.scripts.leerSalida(SCRIPT, ruta);

    const correos = new Map<string, CorreoGenerado>();
    for (const fila of filas) {
      const placeId = fila.place_id?.trim();
      const asunto = fila.asunto?.trim();
      const cuerpo = fila.cuerpo?.trim();
      if (placeId && esperados.has(placeId) && asunto && cuerpo) {
        correos.set(placeId, { asunto, cuerpo });
      }
    }
    const sinCorreo = esperados.size - correos.size;
    if (sinCorreo > 0) {
      this.logger.warn(`${sinCorreo} lead(s) quedaron sin correo redactado`);
    }
    return correos;
  }
}
