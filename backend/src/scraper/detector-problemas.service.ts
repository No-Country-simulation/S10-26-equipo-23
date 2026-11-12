import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Papa from 'papaparse';
import type { ResenaParaDetectar } from '../common/problemas.js';
import { entornoDelProceso } from '../config/entorno-del-proceso.js';
import type { Env } from '../config/env.schema.js';
import { leerLineas } from './leer-lineas.js';

const SCRIPT = 'DETECTA_PROBLEMAS.py';
const ARCHIVO_ENTRADAS = 'DETECTA_PROBLEMAS_inputs.json';
const MAX_RATING = 2.1;
const NEGOCIOS_POR_GRUPO = 20;
const LINEAS_GUARDADAS = 50;
const CARPETA_TMP = path.resolve(import.meta.dirname, '../../tmp/problemas');
const COLUMNAS_PROBLEMA = ['problema_1', 'problema_2', 'problema_3'] as const;

export const MENSAJE_CUOTA = 'Se acabó la cuota de Gemini. Intenta más tarde.';
const MENSAJE_SIN_RESPUESTA =
  'Gemini no devolvió los problemas de todos los leads. Intenta más tarde.';

const ejecutarArchivo = promisify(execFile);

export type AvanceDeteccion = { hechos: number; total: number };

export type OpcionesDeteccion = {
  signal: AbortSignal;
  alAvanzar: (avance: AvanceDeteccion) => void;
};

export class DeteccionProblemasError extends Error {}

type FilaSalida = Record<string, string | undefined>;

@Injectable()
export class DetectorProblemasService {
  private readonly logger = new Logger(DetectorProblemasService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async detectar(
    resenas: ResenaParaDetectar[],
    opciones: OpcionesDeteccion,
  ): Promise<Map<string, string[]>> {
    const esperados = new Set(resenas.map((resena) => resena.place_id));
    if (esperados.size === 0) {
      return new Map();
    }
    const total = Math.ceil(esperados.size / NEGOCIOS_POR_GRUPO);
    opciones.alAvanzar({ hechos: 0, total });

    const inicio = Date.now();
    this.logger.log(
      `Detección de problemas iniciada: ${esperados.size} lead(s), ${resenas.length} reseña(s) negativa(s), ${total} grupo(s)`,
    );
    const carpeta = path.join(CARPETA_TMP, randomUUID());
    await mkdir(carpeta, { recursive: true });
    try {
      const rutaResenas = path.join(carpeta, 'resenas.csv');
      const rutaSalida = path.join(carpeta, 'problemas.csv');
      await copyFile(
        path.join(this.config.get('SCRAPER_DIR', { infer: true }), SCRIPT),
        path.join(carpeta, SCRIPT),
      );
      await writeFile(
        rutaResenas,
        Papa.unparse(resenas, { columns: ['place_id', 'texto', 'rating'] }),
        'utf8',
      );
      await writeFile(
        path.join(carpeta, ARCHIVO_ENTRADAS),
        JSON.stringify({
          API_KEY: this.config.get('GEMINI_API_KEY', { infer: true }),
          MODELO: this.config.get('GEMINI_MODELO', { infer: true }),
          RUTA_RESENAS: rutaResenas,
          RUTA_SALIDA: rutaSalida,
          MAX_RATING,
        }),
        'utf8',
      );

      await this.ejecutar(carpeta, total, opciones);
      const problemas = await this.leerSalida(rutaSalida, esperados);
      this.logger.log(
        `Detección de problemas terminada: ${problemas.size} lead(s) en ${Math.round((Date.now() - inicio) / 1000)} s`,
      );
      return problemas;
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  }

  private async ejecutar(
    carpeta: string,
    total: number,
    { signal, alAvanzar }: OpcionesDeteccion,
  ) {
    if (signal.aborted) {
      throw new Error('La detección de problemas se canceló');
    }
    const proceso = spawn(
      this.config.get('SCRAPER_PYTHON', { infer: true }),
      ['-u', SCRIPT],
      {
        cwd: carpeta,
        env: { ...entornoDelProceso(), PYTHONUTF8: '1' },
        windowsHide: true,
      },
    );
    const detener = () => void this.detener(proceso);
    signal.addEventListener('abort', detener, { once: true });

    const ultimas: string[] = [];
    let cuotaEnGrupo = false;
    let omitido: string | null = null;
    leerLineas(proceso, (linea) => {
      this.logger.debug(linea);
      ultimas.push(linea);
      if (ultimas.length > LINEAS_GUARDADAS) {
        ultimas.shift();
      }
      if (/^Grupo \d+\/\d+ /.test(linea)) {
        cuotaEnGrupo = false;
        return;
      }
      if (/límite de cuota \(429\)/.test(linea)) {
        cuotaEnGrupo = true;
        return;
      }
      const guardado = /-> Grupo (\d+) guardado/.exec(linea);
      if (guardado) {
        alAvanzar({ hechos: Number(guardado[1]), total });
        return;
      }
      if (omitido === null && /-> Grupo \d+ omitido/.test(linea)) {
        omitido = cuotaEnGrupo ? MENSAJE_CUOTA : MENSAJE_SIN_RESPUESTA;
        detener();
      }
    });

    const resultado = await new Promise<{
      codigo: number | null;
      error?: Error;
    }>((resolver) => {
      proceso.once('error', (error) => resolver({ codigo: null, error }));
      proceso.once('close', (codigo) => resolver({ codigo }));
    });
    signal.removeEventListener('abort', detener);

    if (signal.aborted) {
      throw new Error('La detección de problemas se canceló');
    }
    if (omitido !== null) {
      throw new DeteccionProblemasError(omitido);
    }
    if (resultado.error) {
      throw new DeteccionProblemasError(
        `No se pudo lanzar la detección de problemas: ${resultado.error.message}`,
      );
    }
    if (resultado.codigo !== 0) {
      throw new DeteccionProblemasError(
        this.mensajeDeError(ultimas, resultado.codigo),
      );
    }
  }

  private mensajeDeError(ultimas: string[], codigo: number | null) {
    const configuracion = ultimas
      .map((linea) => /Error de configuración \((\d+)\)/.exec(linea))
      .find((coincidencia) => coincidencia !== null);
    if (configuracion?.[1] === '404') {
      return `No existe el modelo de Gemini «${this.config.get('GEMINI_MODELO', { infer: true })}». Revisa GEMINI_MODELO en backend/.env.`;
    }
    if (configuracion) {
      return `Gemini rechazó la clave o el modelo (código ${configuracion[1]}). Revisa GEMINI_API_KEY y GEMINI_MODELO en backend/.env.`;
    }
    const lineas = ultimas.filter((linea) => linea.trim() !== '');
    const conError = lineas.filter((linea) => /error|exception/i.test(linea));
    const ultima = (conError.at(-1) ?? lineas.at(-1) ?? '').trim();
    return `La detección de problemas terminó con error (código ${codigo ?? 'desconocido'}). ${ultima}`.trim();
  }

  private async leerSalida(ruta: string, esperados: Set<string>) {
    let contenido: string;
    try {
      contenido = await readFile(ruta, 'utf8');
    } catch {
      throw new DeteccionProblemasError(MENSAJE_SIN_RESPUESTA);
    }
    const { data } = Papa.parse<FilaSalida>(contenido, {
      header: true,
      skipEmptyLines: true,
    });

    const problemas = new Map<string, string[]>();
    for (const fila of data) {
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
      throw new DeteccionProblemasError(MENSAJE_SIN_RESPUESTA);
    }
    return problemas;
  }

  private async detener(proceso: ChildProcess) {
    const pid = proceso.pid;
    if (pid === undefined || proceso.exitCode !== null) {
      return;
    }
    try {
      await ejecutarArchivo('taskkill', ['/PID', String(pid), '/T', '/F']);
    } catch (error) {
      this.logger.warn(
        `No se pudo detener la detección de problemas (PID ${pid}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
