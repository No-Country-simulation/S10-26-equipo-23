import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Papa from 'papaparse';
import { entornoDelProceso } from '../config/entorno-del-proceso.js';
import type { Env } from '../config/env.schema.js';
import { leerLineas } from './leer-lineas.js';

const CARPETA_REPO = path.resolve(import.meta.dirname, '../../..');
const CARPETA_TMP = path.resolve(import.meta.dirname, '../../tmp');
const LINEAS_GUARDADAS = 50;
const MENSAJE_CUOTA = 'Se acabó la cuota de Gemini. Intenta más tarde.';
const MENSAJE_SATURADO =
  'Gemini está saturado en este momento (error 503). Intenta más tarde.';

const ejecutarArchivo = promisify(execFile);

export type ScriptGemini = {
  carpeta: string;
  archivo: string;
  entradas: string;
  tmp: string;
  tarea: string;
  sinRespuesta: string;
};

export type AvanceScript = { hechos: number; total: number };

export type OpcionesScript = {
  signal: AbortSignal;
  alAvanzar: (avance: AvanceScript) => void;
};

export type CorridaScript<T> = {
  grupos: number;
  preparar: (carpeta: string) => Promise<Record<string, unknown>>;
  leer: (carpeta: string) => Promise<T>;
  rescatar?: (carpeta: string, error: ScriptGeminiError) => Promise<T>;
};

export type FilaSalida = Record<string, string | undefined>;

export class ScriptGeminiError extends Error {}

function capitalizar(texto: string) {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}

@Injectable()
export class ScriptGeminiService {
  private readonly logger = new Logger(ScriptGeminiService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async ejecutar<T>(
    script: ScriptGemini,
    corrida: CorridaScript<T>,
    opciones: OpcionesScript,
  ): Promise<T> {
    opciones.alAvanzar({ hechos: 0, total: corrida.grupos });

    const carpeta = path.join(CARPETA_TMP, script.tmp, randomUUID());
    await mkdir(carpeta, { recursive: true });
    try {
      await this.copiarScript(script, carpeta);
      const entradas = await corrida.preparar(carpeta);
      await writeFile(
        path.join(carpeta, script.entradas),
        JSON.stringify({
          API_KEY: this.config.get('GEMINI_API_KEY', { infer: true }),
          MODELO: this.config.get('GEMINI_MODELO', { infer: true }),
          ...entradas,
        }),
        'utf8',
      );

      try {
        await this.correr(script, carpeta, corrida.grupos, opciones);
      } catch (error) {
        if (error instanceof ScriptGeminiError && corrida.rescatar) {
          return await corrida.rescatar(carpeta, error);
        }
        throw error;
      }
      return await corrida.leer(carpeta);
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  }

  async leerSalida(script: ScriptGemini, ruta: string): Promise<FilaSalida[]> {
    let contenido: string;
    try {
      contenido = await readFile(ruta, 'utf8');
    } catch {
      throw new ScriptGeminiError(script.sinRespuesta);
    }
    const sinBom =
      contenido.charCodeAt(0) === 0xfeff ? contenido.slice(1) : contenido;
    const { data } = Papa.parse<FilaSalida>(sinBom, {
      header: true,
      skipEmptyLines: true,
    });
    return data;
  }

  private async copiarScript(script: ScriptGemini, carpeta: string) {
    const origen = path.join(CARPETA_REPO, script.carpeta, script.archivo);
    try {
      await copyFile(origen, path.join(carpeta, script.archivo));
    } catch {
      throw new ScriptGeminiError(
        `No se encontró el script ${script.carpeta}/${script.archivo} en el repositorio.`,
      );
    }
  }

  private async correr(
    script: ScriptGemini,
    carpeta: string,
    total: number,
    { signal, alAvanzar }: OpcionesScript,
  ) {
    const cancelada = `${capitalizar(script.tarea)} se canceló`;
    if (signal.aborted) {
      throw new Error(cancelada);
    }
    const proceso = spawn(
      this.config.get('SCRAPER_PYTHON', { infer: true }),
      ['-u', script.archivo],
      {
        cwd: carpeta,
        env: { ...entornoDelProceso(), PYTHONUTF8: '1' },
        windowsHide: true,
      },
    );
    const detener = () => void this.detener(script, proceso);
    signal.addEventListener('abort', detener, { once: true });

    const ultimas: string[] = [];
    let cuotaEnGrupo = false;
    let ultimoFallo: string | null = null;
    let omitido: string | null = null;
    leerLineas(proceso, (linea) => {
      this.logger.debug(linea);
      ultimas.push(linea);
      if (ultimas.length > LINEAS_GUARDADAS) {
        ultimas.shift();
      }
      if (/^Grupo \d+\/\d+ /.test(linea)) {
        cuotaEnGrupo = false;
        ultimoFallo = null;
        return;
      }
      if (/límite de cuota \(429\)/.test(linea)) {
        cuotaEnGrupo = true;
        return;
      }
      const fallo = /Intento \d+\/\d+ falló: (.*)/.exec(linea);
      if (fallo) {
        ultimoFallo = fallo[1];
        return;
      }
      const guardado = /-> Grupo (\d+) guardado/.exec(linea);
      if (guardado) {
        alAvanzar({ hechos: Number(guardado[1]), total });
        return;
      }
      if (omitido === null && /-> Grupo \d+ omitido/.test(linea)) {
        omitido = this.mensajeDeOmitido(script, cuotaEnGrupo, ultimoFallo);
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
      throw new Error(cancelada);
    }
    if (omitido !== null) {
      throw new ScriptGeminiError(omitido);
    }
    if (resultado.error) {
      throw new ScriptGeminiError(
        `No se pudo lanzar ${script.tarea}: ${resultado.error.message}`,
      );
    }
    if (resultado.codigo !== 0) {
      throw new ScriptGeminiError(
        this.mensajeDeError(script, ultimas, resultado.codigo),
      );
    }
  }

  private mensajeDeOmitido(
    script: ScriptGemini,
    cuota: boolean,
    ultimoFallo: string | null,
  ) {
    if (cuota) {
      return MENSAJE_CUOTA;
    }
    if (ultimoFallo === null) {
      return script.sinRespuesta;
    }
    this.logger.warn(
      `Gemini no respondió a ${script.tarea}. Último fallo: ${ultimoFallo}`,
    );
    return /\b503\b|UNAVAILABLE/.test(ultimoFallo)
      ? MENSAJE_SATURADO
      : script.sinRespuesta;
  }

  private mensajeDeError(
    script: ScriptGemini,
    ultimas: string[],
    codigo: number | null,
  ) {
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
    return `${capitalizar(script.tarea)} terminó con error (código ${codigo ?? 'desconocido'}). ${ultima}`.trim();
  }

  private async detener(script: ScriptGemini, proceso: ChildProcess) {
    const pid = proceso.pid;
    if (pid === undefined || proceso.exitCode !== null) {
      return;
    }
    try {
      await ejecutarArchivo('taskkill', ['/PID', String(pid), '/T', '/F']);
    } catch (error) {
      this.logger.warn(
        `No se pudo detener ${script.tarea} (PID ${pid}): ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
