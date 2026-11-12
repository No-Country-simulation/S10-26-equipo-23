import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filter, Subject, type Observable } from 'rxjs';
import {
  BusquedasRepository,
  type Busqueda,
  type UbicacionConCiudad,
} from '../busquedas/busquedas.repository.js';
import {
  filtrosEfectivos,
  type EstadoBusqueda,
  type EstadoFinal,
} from '../common/busqueda.js';
import { PAISES_SCRAPER } from '../common/paises-scraper.js';
import { entornoDelProceso } from '../config/entorno-del-proceso.js';
import type { Env } from '../config/env.schema.js';
import {
  ImportadorService,
  type AnalisisGemini,
  type BusquedaPendiente,
  type Importacion,
} from '../importador/importador.service.js';
import { DetectorProblemasService } from './detector-problemas.service.js';
import { GeneradorCorreosService } from './generador-correos.service.js';
import { leerLineas } from './leer-lineas.js';
import {
  ScriptGeminiError,
  type OpcionesScript,
} from './script-gemini.service.js';

const CONSULTAS_POR_SESION = 72;
const DESCANSO_ENTRE_SESIONES_MS = 30 * 60 * 1000;
const LINEAS_GUARDADAS = 50;
const CARPETA_TMP = path.resolve(import.meta.dirname, '../../tmp/scraper');
const ERROR_INTERRUPCION = 'Se interrumpió porque el backend se cerró';

const ejecutarArchivo = promisify(execFile);

export type Progreso = {
  sesion: number;
  fase: 1 | 2 | 3 | 4;
  hechas: number;
  total: number;
};

export type EventoProgreso = {
  busqueda_id: string;
  estado: EstadoBusqueda;
  progreso: Progreso | null;
};

type Ejecucion = {
  busqueda: Busqueda;
  sesion: number;
  enviadas: Set<string>;
  candidatosAntesDeSoloFichas: number | null;
  proceso: ChildProcess | null;
  descanso: NodeJS.Timeout | null;
  progreso: Progreso | null;
  ultimasLineas: string[];
  controlador: AbortController;
  detenida: boolean;
};

type ImportacionEnCurso = {
  busquedaIds: Set<string>;
  actual: string | null;
  controlador: AbortController | null;
  progreso: Progreso | null;
};

function mensajeDe(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class ScraperService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ScraperService.name);
  private readonly cambios = new Subject<EventoProgreso>();
  private ejecucion: Ejecucion | null = null;
  private importacion: ImportacionEnCurso | null = null;

  constructor(
    private readonly busquedas: BusquedasRepository,
    private readonly importador: ImportadorService,
    private readonly detector: DetectorProblemasService,
    private readonly generador: GeneradorCorreosService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap() {
    const interrumpidas =
      await this.busquedas.marcarInterrumpidas(ERROR_INTERRUPCION);
    if (interrumpidas > 0) {
      this.logger.warn(
        `${interrumpidas} búsqueda(s) en curso pasaron a fallida al arrancar. Puede haber quedado una ventana de Chrome abierta.`,
      );
    }
  }

  async onModuleDestroy() {
    const importacion = this.importacion;
    if (importacion) {
      importacion.controlador?.abort();
      for (const busquedaId of [...importacion.busquedaIds]) {
        await this.finalizar(busquedaId, 'fallida', ERROR_INTERRUPCION);
      }
    }
    const ejecucion = this.ejecucion;
    if (!ejecucion) {
      return;
    }
    await this.detener(ejecucion);
    await this.finalizar(ejecucion.busqueda.id, 'fallida', ERROR_INTERRUPCION);
  }

  async exigir(busquedaId: string): Promise<Busqueda> {
    const busqueda = await this.busquedas.obtener(busquedaId);
    if (!busqueda) {
      throw new NotFoundException('No se encontró la búsqueda.', {
        errorCode: 'BUSQUEDA_NO_ENCONTRADA',
      });
    }
    return busqueda;
  }

  progresoActual(busquedaId: string): Progreso | null {
    if (this.ejecucion?.busqueda.id === busquedaId) {
      return this.ejecucion.progreso;
    }
    return this.importacion?.actual === busquedaId
      ? this.importacion.progreso
      : null;
  }

  cambiosDe(busquedaId: string): Observable<EventoProgreso> {
    return this.cambios.pipe(
      filter((evento) => evento.busqueda_id === busquedaId),
    );
  }

  lanzar(busqueda: Busqueda): void {
    const ejecucion: Ejecucion = {
      busqueda,
      sesion: 0,
      enviadas: new Set(),
      candidatosAntesDeSoloFichas: null,
      proceso: null,
      descanso: null,
      progreso: null,
      ultimasLineas: [],
      controlador: new AbortController(),
      detenida: false,
    };
    this.ejecucion = ejecucion;
    this.logger.log(
      `Búsqueda ${busqueda.id} iniciada: «${busqueda.rubro}» en ${busqueda.ubicaciones.length} ciudad(es)`,
    );

    const noSoportada = busqueda.ubicaciones.find(
      (ubicacion) =>
        !(PAISES_SCRAPER as readonly string[]).includes(
          ubicacion.ciudad.pais.nombre,
        ),
    );
    if (noSoportada) {
      void this.fallar(
        ejecucion,
        `País no soportado por el scraper: ${noSoportada.ciudad.pais.nombre}`,
      );
      return;
    }
    void this.siguientePaso(ejecucion);
  }

  async cancelar(busquedaId: string): Promise<Busqueda> {
    const busqueda = await this.exigir(busquedaId);
    if (busqueda.estado !== 'en_curso') {
      throw new ConflictException(
        'La búsqueda ya terminó: no se puede cancelar.',
        { errorCode: 'BUSQUEDA_FINALIZADA' },
      );
    }
    const ejecucion = this.ejecucionDe(busquedaId);
    if (ejecucion) {
      await this.detener(ejecucion);
    }
    this.sacarDeLaImportacion(busquedaId);
    await this.finalizar(busquedaId, 'cancelada');
    return this.exigir(busquedaId);
  }

  async importarArchivos(entrada: unknown): Promise<Importacion> {
    const preparados = await this.importador.prepararArchivos(entrada);
    if (await this.busquedas.hayEnCurso()) {
      throw new ConflictException(
        'Ya hay una búsqueda en curso. Espera a que termine o cancélala.',
        { errorCode: 'BUSQUEDA_EN_CURSO' },
      );
    }
    const { importacion, pendientes } =
      await this.importador.crearBusquedasImportadas(preparados);
    const enCurso: ImportacionEnCurso = {
      busquedaIds: new Set(pendientes.map((pendiente) => pendiente.id)),
      actual: null,
      controlador: null,
      progreso: null,
    };
    this.importacion = enCurso;
    void this.procesarImportacion(enCurso, pendientes);
    return importacion;
  }

  async eliminar(busquedaId: string): Promise<void> {
    const busqueda = await this.exigir(busquedaId);
    const ejecucion = this.ejecucionDe(busquedaId);
    if (ejecucion) {
      await this.detener(ejecucion);
      this.ejecucion = null;
    }
    this.sacarDeLaImportacion(busquedaId);
    await this.busquedas.eliminar(busquedaId);
    this.logger.log(`Búsqueda ${busquedaId} eliminada`);
    if (busqueda.estado === 'en_curso') {
      this.cambios.next({
        busqueda_id: busquedaId,
        estado: 'cancelada',
        progreso: null,
      });
    }
  }

  private ejecucionDe(busquedaId: string) {
    return this.ejecucion?.busqueda.id === busquedaId ? this.ejecucion : null;
  }

  private sacarDeLaImportacion(busquedaId: string) {
    const importacion = this.importacion;
    if (!importacion?.busquedaIds.delete(busquedaId)) {
      return;
    }
    if (importacion.actual === busquedaId) {
      importacion.controlador?.abort();
    }
  }

  private async procesarImportacion(
    importacion: ImportacionEnCurso,
    pendientes: BusquedaPendiente[],
  ) {
    for (const pendiente of pendientes) {
      if (!importacion.busquedaIds.has(pendiente.id)) {
        continue;
      }
      const controlador = new AbortController();
      importacion.actual = pendiente.id;
      importacion.controlador = controlador;
      importacion.progreso = null;
      try {
        await this.importador.guardarBusquedaImportada(
          pendiente,
          this.analisisPara(pendiente.id, 0, controlador.signal, (progreso) => {
            importacion.progreso = progreso;
          }),
        );
        if (!controlador.signal.aborted) {
          await this.finalizar(pendiente.id, 'completada');
        }
      } catch (error) {
        if (!controlador.signal.aborted) {
          const mensaje = this.mensajeDeImportacion(error);
          this.logger.error(`Búsqueda ${pendiente.id} fallida: ${mensaje}`);
          await this.finalizar(pendiente.id, 'fallida', mensaje);
        }
      }
      importacion.busquedaIds.delete(pendiente.id);
    }
    if (this.importacion === importacion) {
      this.importacion = null;
    }
  }

  private analisisPara(
    busquedaId: string,
    sesion: number,
    signal: AbortSignal,
    alGuardarProgreso: (progreso: Progreso) => void,
  ): AnalisisGemini {
    const opciones = (fase: 3 | 4): OpcionesScript => ({
      signal,
      alAvanzar: ({ hechos, total }) => {
        const progreso: Progreso = { sesion, fase, hechas: hechos, total };
        alGuardarProgreso(progreso);
        this.cambios.next({
          busqueda_id: busquedaId,
          estado: 'en_curso',
          progreso,
        });
      },
    });
    const exigirEnCurso = () => {
      if (signal.aborted) {
        throw new Error('La búsqueda se detuvo');
      }
    };
    return {
      detectar: async (resenas) => {
        const problemas = await this.detector.detectar(resenas, opciones(3));
        exigirEnCurso();
        return problemas;
      },
      generarCorreos: async (negocios) => {
        const correos = await this.generador.generar(negocios, opciones(4), {
          tolerante: true,
        });
        exigirEnCurso();
        return correos;
      },
    };
  }

  private mensajeDeImportacion(error: unknown) {
    if (error instanceof ScriptGeminiError) {
      return error.message;
    }
    this.logger.error(error instanceof Error ? error.stack : error);
    return `La importación falló: ${mensajeDe(error)}`;
  }

  private async siguientePaso(ejecucion: Ejecucion) {
    try {
      const analisis = await this.importador.analizarBusqueda(
        ejecucion.busqueda.id,
      );
      if (ejecucion.detenida) {
        return;
      }

      const sinFilas = new Set(analisis.ubicaciones_sin_filas);
      const pendientes = ejecucion.busqueda.ubicaciones
        .filter(
          (ubicacion) =>
            sinFilas.has(ubicacion.id) && !ejecucion.enviadas.has(ubicacion.id),
        )
        .slice(0, CONSULTAS_POR_SESION);
      if (pendientes.length > 0) {
        this.programarSesion(ejecucion, pendientes);
        return;
      }

      const anterior = ejecucion.candidatosAntesDeSoloFichas;
      const noBajo =
        anterior !== null && analisis.candidatos_sin_ficha >= anterior;
      if (analisis.candidatos_sin_ficha > 0 && !noBajo) {
        ejecucion.candidatosAntesDeSoloFichas = analisis.candidatos_sin_ficha;
        this.programarSesion(ejecucion, []);
        return;
      }

      await this.importar(ejecucion);
    } catch (error) {
      await this.fallar(ejecucion, `Error del scraper: ${mensajeDe(error)}`);
    }
  }

  private programarSesion(
    ejecucion: Ejecucion,
    ubicaciones: UbicacionConCiudad[],
  ) {
    if (ejecucion.sesion === 0) {
      void this.ejecutarSesion(ejecucion, ubicaciones);
      return;
    }
    this.logger.log(
      `Búsqueda ${ejecucion.busqueda.id}: descanso de ${DESCANSO_ENTRE_SESIONES_MS / 60_000} min antes de la sesión ${ejecucion.sesion + 1}`,
    );
    ejecucion.descanso = setTimeout(() => {
      ejecucion.descanso = null;
      void this.ejecutarSesion(ejecucion, ubicaciones);
    }, DESCANSO_ENTRE_SESIONES_MS);
  }

  private async ejecutarSesion(
    ejecucion: Ejecucion,
    ubicaciones: UbicacionConCiudad[],
  ) {
    if (ejecucion.detenida) {
      return;
    }
    const { busqueda } = ejecucion;
    try {
      ejecucion.sesion += 1;
      ejecucion.ultimasLineas = [];
      ubicaciones.forEach((ubicacion) => ejecucion.enviadas.add(ubicacion.id));

      const ciudades = ubicaciones.map((ubicacion) => [
        ubicacion.ciudad.nombre,
        ubicacion.ciudad.pais.nombre,
      ]);
      const paises = [...new Set(ciudades.map(([, pais]) => pais))];
      const bloque = String(ejecucion.sesion);
      const filtros = filtrosEfectivos(busqueda);
      const entradas = {
        CIUDADES_TODAS: ciudades,
        CIUDADES: ciudades,
        PAISES_ACTIVOS: paises,
        BLOQUES: { [bloque]: paises },
        BLOQUE_ACTIVO: bloque,
        DESCRIPCION: [busqueda.rubro],
        RATING_MIN: filtros.rating_minimo,
        RATING_MAX: filtros.rating_maximo,
        MIN_RESENAS: filtros.min_resenas,
      };

      await mkdir(CARPETA_TMP, { recursive: true });
      const base = path.join(CARPETA_TMP, `${busqueda.id}-${ejecucion.sesion}`);
      await writeFile(`${base}.json`, JSON.stringify(entradas), 'utf8');

      const carpeta = this.config.get('SCRAPER_DIR', { infer: true });
      const notebook = path.join(
        carpeta,
        this.config.get('SCRAPER_NOTEBOOK', { infer: true }),
      );
      const proceso = spawn(
        this.config.get('SCRAPER_PYTHON', { infer: true }),
        [
          '-m',
          'papermill',
          notebook,
          `${base}.ipynb`,
          '-f',
          `${base}.json`,
          '--cwd',
          carpeta,
          '--log-output',
          '--no-progress-bar',
        ],
        {
          cwd: carpeta,
          env: { ...entornoDelProceso(), PYTHONUTF8: '1' },
          windowsHide: true,
        },
      );
      ejecucion.proceso = proceso;
      this.actualizarProgreso(ejecucion, {
        sesion: ejecucion.sesion,
        fase: 1,
        hechas: 0,
        total: ciudades.length,
      });
      this.logger.log(
        `Búsqueda ${busqueda.id}: sesión ${ejecucion.sesion} iniciada con ${ciudades.length} ciudad(es)${ciudades.length === 0 ? ' (solo fichas)' : ''}`,
      );

      const inicio = Date.now();
      leerLineas(proceso, (linea) => this.procesarLinea(ejecucion, linea));
      const resultado = await new Promise<{
        codigo: number | null;
        senal: string | null;
        error?: Error;
      }>((resolver) => {
        proceso.once('error', (error) =>
          resolver({ codigo: null, senal: null, error }),
        );
        proceso.once('close', (codigo, senal) => resolver({ codigo, senal }));
      });
      ejecucion.proceso = null;
      if (ejecucion.detenida) {
        return;
      }
      this.logger.log(
        `Búsqueda ${busqueda.id}: sesión ${ejecucion.sesion} terminada con código ${resultado.codigo ?? resultado.senal} en ${Math.round((Date.now() - inicio) / 1000)} s`,
      );

      if (resultado.error) {
        await this.fallar(
          ejecucion,
          `No se pudo lanzar el scraper: ${resultado.error.message}`,
        );
        return;
      }
      if (resultado.codigo !== 0) {
        await this.fallar(
          ejecucion,
          `El scraper terminó con error (código ${resultado.codigo ?? resultado.senal}). ${this.ultimaLineaDeError(ejecucion)}`.trim(),
        );
        return;
      }
      await this.siguientePaso(ejecucion);
    } catch (error) {
      await this.fallar(ejecucion, `Error del scraper: ${mensajeDe(error)}`);
    }
  }

  private procesarLinea(ejecucion: Ejecucion, linea: string) {
    this.logger.debug({ busqueda_id: ejecucion.busqueda.id }, linea);
    ejecucion.ultimasLineas.push(linea);
    if (ejecucion.ultimasLineas.length > LINEAS_GUARDADAS) {
      ejecucion.ultimasLineas.shift();
    }

    const progreso = ejecucion.progreso;
    if (!progreso) {
      return;
    }
    if (progreso.fase === 1 && /^\s*(Buscando|Saltando) /.test(linea)) {
      this.actualizarProgreso(ejecucion, {
        ...progreso,
        hechas: Math.min(progreso.hechas + 1, progreso.total),
      });
      return;
    }
    const lote = /este lote: (\d+)/.exec(linea);
    if (lote) {
      this.actualizarProgreso(ejecucion, {
        ...progreso,
        fase: 2,
        hechas: 0,
        total: Number(lote[1]),
      });
      return;
    }
    const ficha = /^\s*\((\d+)\/(\d+)\)/.exec(linea);
    if (progreso.fase === 2 && ficha) {
      this.actualizarProgreso(ejecucion, {
        ...progreso,
        hechas: Number(ficha[1]),
      });
    }
  }

  private actualizarProgreso(ejecucion: Ejecucion, progreso: Progreso) {
    ejecucion.progreso = progreso;
    this.cambios.next({
      busqueda_id: ejecucion.busqueda.id,
      estado: 'en_curso',
      progreso,
    });
  }

  private ultimaLineaDeError(ejecucion: Ejecucion) {
    const lineas = ejecucion.ultimasLineas.filter(
      (linea) => linea.trim() !== '',
    );
    const conError = lineas.filter((linea) => /error|exception/i.test(linea));
    return (conError.at(-1) ?? lineas.at(-1) ?? '').trim();
  }

  private async importar(ejecucion: Ejecucion) {
    try {
      await this.importador.importarBusqueda(
        ejecucion.busqueda.id,
        this.analisisPara(
          ejecucion.busqueda.id,
          ejecucion.sesion,
          ejecucion.controlador.signal,
          (progreso) => {
            ejecucion.progreso = progreso;
          },
        ),
      );
    } catch (error) {
      if (!ejecucion.detenida) {
        await this.fallar(ejecucion, this.mensajeDeImportacion(error));
      }
      return;
    }
    if (!ejecucion.detenida) {
      await this.finalizar(ejecucion.busqueda.id, 'completada');
    }
  }

  private async detener(ejecucion: Ejecucion) {
    ejecucion.detenida = true;
    ejecucion.controlador.abort();
    if (ejecucion.descanso) {
      clearTimeout(ejecucion.descanso);
      ejecucion.descanso = null;
    }
    const pid = ejecucion.proceso?.pid;
    if (pid === undefined) {
      return;
    }
    try {
      await ejecutarArchivo('taskkill', ['/PID', String(pid), '/T', '/F']);
    } catch (error) {
      this.logger.warn(
        `No se pudo detener el scraper (PID ${pid}): ${mensajeDe(error)}`,
      );
    }
  }

  private async fallar(ejecucion: Ejecucion, mensaje: string) {
    this.logger.error(`Búsqueda ${ejecucion.busqueda.id} fallida: ${mensaje}`);
    await this.finalizar(ejecucion.busqueda.id, 'fallida', mensaje);
  }

  private async finalizar(
    busquedaId: string,
    estado: EstadoFinal,
    error: string | null = null,
  ) {
    const ejecucion = this.ejecucionDe(busquedaId);
    if (ejecucion) {
      ejecucion.detenida = true;
      this.ejecucion = null;
    }
    const cambio = await this.busquedas.finalizar(busquedaId, estado, error);
    if (cambio) {
      this.logger.log(`Búsqueda ${busquedaId}: ${estado}`);
      this.cambios.next({ busqueda_id: busquedaId, estado, progreso: null });
    }
  }
}
