import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import Papa from 'papaparse';
import type { ResenaParaDetectar } from '../common/problemas.js';
import {
  ScriptGeminiError,
  ScriptGeminiService,
  type OpcionesScript,
  type ScriptGemini,
} from './script-gemini.service.js';

const SCRIPT: ScriptGemini = {
  carpeta: 'detecta problemas',
  archivo: 'DETECTA_PROBLEMAS.py',
  entradas: 'DETECTA_PROBLEMAS_inputs.json',
  tmp: 'problemas',
  tarea: 'la detección de problemas',
  sinRespuesta:
    'Gemini no devolvió los problemas de todos los leads. Intenta más tarde.',
};
const MAX_RATING = 2.1;
const NEGOCIOS_POR_GRUPO = 20;
const COLUMNAS_PROBLEMA = ['problema_1', 'problema_2', 'problema_3'] as const;

@Injectable()
export class DetectorProblemasService {
  private readonly logger = new Logger(DetectorProblemasService.name);

  constructor(private readonly scripts: ScriptGeminiService) {}

  async detectar(
    resenas: ResenaParaDetectar[],
    opciones: OpcionesScript,
  ): Promise<Map<string, string[]>> {
    const esperados = new Set(resenas.map((resena) => resena.place_id));
    if (esperados.size === 0) {
      return new Map();
    }
    const grupos = Math.ceil(esperados.size / NEGOCIOS_POR_GRUPO);

    const inicio = Date.now();
    this.logger.log(
      `Detección de problemas iniciada: ${esperados.size} lead(s), ${resenas.length} reseña(s) negativa(s), ${grupos} grupo(s)`,
    );
    const problemas = await this.scripts.ejecutar(
      SCRIPT,
      {
        grupos,
        preparar: async (carpeta) => {
          const rutaResenas = path.join(carpeta, 'resenas.csv');
          await writeFile(
            rutaResenas,
            Papa.unparse(resenas, { columns: ['place_id', 'texto', 'rating'] }),
            'utf8',
          );
          return {
            RUTA_RESENAS: rutaResenas,
            RUTA_SALIDA: path.join(carpeta, 'problemas.csv'),
            MAX_RATING,
          };
        },
        leer: (carpeta) =>
          this.leerSalida(path.join(carpeta, 'problemas.csv'), esperados),
      },
      opciones,
    );
    this.logger.log(
      `Detección de problemas terminada: ${problemas.size} lead(s) en ${Math.round((Date.now() - inicio) / 1000)} s`,
    );
    return problemas;
  }

  private async leerSalida(ruta: string, esperados: Set<string>) {
    const filas = await this.scripts.leerSalida(SCRIPT, ruta);

    const problemas = new Map<string, string[]>();
    for (const fila of filas) {
      const placeId = fila.place_id?.trim();
      if (!placeId || !esperados.has(placeId)) {
        continue;
      }
      problemas.set(
        placeId,
        COLUMNAS_PROBLEMA.map((columna) => fila[columna]?.trim() ?? '').filter(
          (problema) => problema !== '',
        ),
      );
    }
    if ([...esperados].some((placeId) => !problemas.has(placeId))) {
      throw new ScriptGeminiError(SCRIPT.sinRespuesta);
    }
    return problemas;
  }
}
