import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cumpleFiltros, type Filtros } from '../common/busqueda.js';
import type { GenerarCorreos, NegocioParaCorreo } from '../common/correos.js';
import { PAISES_SCRAPER } from '../common/paises-scraper.js';
import {
  RATING_NEGATIVA,
  type DetectarProblemas,
  type ResenaParaDetectar,
} from '../common/problemas.js';
import { exceptionFactory } from '../common/validacion/exception-factory.js';
import { ValidacionException } from '../common/validacion/validacion.exception.js';
import type { Env } from '../config/env.schema.js';
import {
  COLUMNAS_REDES,
  SEPARADOR_LISTA,
  type Archivo,
  type FilaFicha,
  type FilaNegocio,
} from './columnas-scraper.js';
import { createImportacionSchema } from './dto/create-importacion.dto.js';
import {
  ImportadorRepository,
  type BusquedaImportada,
  type BusquedaParaImportar,
  type ContactoNuevo,
  type DatosSinAnalisis,
  type DetallesImportacion,
  type LeadNuevo,
  type LugarImportado,
  type NegocioNuevo,
  type ResenaNueva,
} from './importador.repository.js';
import {
  ColumnasFaltantesError,
  leerCsv,
  leerCsvSubido,
  type FilaDe,
} from './lector-csv.js';

const TIMEOUT_IMPORTACION_MS = 120_000;
const MAX_EJEMPLOS_TILDES = 5;
const MENSAJE_CAMPOS = 'Revisa los datos marcados.';
const SIN_FILTROS: Filtros = {
  rating_minimo: null,
  rating_maximo: null,
  min_resenas: null,
};

export type AnalisisBusqueda = {
  ubicaciones_sin_filas: string[];
  candidatos_sin_ficha: number;
};

export type ResumenImportacion = {
  busqueda_id: string;
  negocios: number;
  leads: number;
  resenas: number;
  contactos: number;
  filas_invalidas: number;
  ubicaciones_sin_filas: number;
};

export type BusquedaPendiente = {
  id: string;
  rubro: string;
  datos: DatosSinAnalisis;
};

export type AnalisisGemini = {
  detectar: DetectarProblemas;
  generarCorreos: GenerarCorreos;
};

export type ArchivosPreparados = {
  busquedas: BusquedaImportada[];
  detalles: DetallesImportacion;
  invalidas: number;
};

export type Importacion = {
  busquedas: {
    id: string;
    rubro: string;
    cantidad_ubicaciones: number;
    cantidad_negocios: number;
    cantidad_leads: number;
    cantidad_resenas: number;
    cantidad_contactos: number;
  }[];
  ciudades_creadas: number;
  filas_invalidas: number;
};

type Lector = <A extends Archivo>(
  archivo: A,
  alLeerFila: (fila: FilaDe<A>) => void,
) => Promise<number>;

type NegocioElegido = FilaNegocio & { busqueda_ubicacion_id: string };

type LecturaNegocios = {
  elegidos: NegocioElegido[];
  primerAvistamiento: Map<string, string>;
  ubicacionesSinFilas: string[];
  invalidas: number;
};

type NegocioSubido = FilaNegocio & { lugar: string };

type GrupoRubro = {
  lugares: Map<string, LugarImportado>;
  negocios: Map<string, NegocioSubido>;
};

type LecturaSubida = {
  grupos: Map<string, GrupoRubro>;
  primerAvistamiento: Map<string, string>;
  placeIds: Set<string>;
  invalidas: number;
};

type Detalles = DetallesImportacion & {
  fichas: Map<string, FilaFicha>;
  invalidas: number;
};

function fechaLocal(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function sinTildes(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function dividir(valor: string | null) {
  return (valor ?? '')
    .split(SEPARADOR_LISTA)
    .map((parte) => parte.trim())
    .filter((parte) => parte !== '');
}

function contactosDe(ficha: FilaFicha): ContactoNuevo[] {
  const contactos: ContactoNuevo[] = [];
  const vistos = new Set<string>();
  const agregar = (
    tipo: string,
    valor: string | null,
    subtipo: string | null,
    fuente: string,
  ) => {
    if (!valor || vistos.has(`${tipo}|${valor}`)) {
      return;
    }
    vistos.add(`${tipo}|${valor}`);
    contactos.push({ tipo, subtipo, valor, fuente });
  };

  agregar('telefono', ficha.telefono, ficha.tipo_telefono, 'google_maps');
  agregar('web', ficha.web, ficha.tipo_web, 'google_maps');
  for (const email of dividir(ficha.emails_web)) {
    agregar('email', email, null, 'web_negocio');
  }
  for (const celular of dividir(ficha.celulares_web)) {
    agregar('telefono', celular, null, 'web_negocio');
  }
  for (const red of COLUMNAS_REDES) {
    agregar(red, ficha[red], null, 'web_negocio');
  }
  return contactos;
}

function aNegocio(
  fila: FilaNegocio,
  ficha: FilaFicha | undefined,
  primerAvistamiento: string | undefined,
): Omit<NegocioNuevo, 'busqueda_ubicacion_id'> {
  return {
    google_place_id: fila.place_id,
    nombre: fila.nombre,
    direccion: ficha?.direccion ?? null,
    rating: fila.rating,
    n_resenas: fila.n_resenas,
    hist_5: ficha?.hist_5 ?? null,
    hist_4: ficha?.hist_4 ?? null,
    hist_3: ficha?.hist_3 ?? null,
    hist_2: ficha?.hist_2 ?? null,
    hist_1: ficha?.hist_1 ?? null,
    pct_negativas: ficha?.pct_negativas ?? null,
    primer_avistamiento: primerAvistamiento ?? null,
    url_google_maps: fila.url,
    fecha_extraccion: fila.fecha_extraccion,
  };
}

function resenasParaDetectar(datos: DatosSinAnalisis): ResenaParaDetectar[] {
  const placeIds = new Set(
    datos.negocios
      .map((negocio) => negocio.google_place_id)
      .filter((placeId) => datos.leadsPorPlaceId.has(placeId)),
  );
  const resenas: ResenaParaDetectar[] = [];
  for (const placeId of placeIds) {
    const negativas = (datos.resenasPorPlaceId.get(placeId) ?? [])
      .flatMap((resena) =>
        resena.rating !== null &&
        resena.rating <= RATING_NEGATIVA &&
        resena.texto !== null &&
        resena.texto.trim() !== ''
          ? [{ ...resena, rating: resena.rating, texto: resena.texto }]
          : [],
      )
      .sort(
        (a, b) =>
          (a.meses_atras ?? Number.MAX_SAFE_INTEGER) -
          (b.meses_atras ?? Number.MAX_SAFE_INTEGER),
      );
    for (const resena of negativas) {
      resenas.push({
        place_id: placeId,
        texto: resena.texto,
        rating: resena.rating,
      });
    }
  }
  return resenas;
}

function negociosParaCorreo(
  datos: DatosSinAnalisis,
  busqueda: BusquedaParaImportar,
  problemasPorPlaceId: Map<string, string[]>,
): NegocioParaCorreo[] {
  const lugarPorUbicacion = new Map(
    busqueda.ubicaciones.map((ubicacion) => [ubicacion.id, ubicacion]),
  );
  const negocios = new Map<string, NegocioParaCorreo>();
  for (const negocio of datos.negocios) {
    const placeId = negocio.google_place_id;
    const lugar = lugarPorUbicacion.get(negocio.busqueda_ubicacion_id);
    if (
      !lugar ||
      !datos.leadsPorPlaceId.has(placeId) ||
      negocios.has(placeId)
    ) {
      continue;
    }
    const email = datos.contactosPorPlaceId
      .get(placeId)
      ?.find((contacto) => contacto.tipo === 'email');
    negocios.set(placeId, {
      place_id: placeId,
      nombre: negocio.nombre,
      ciudad: lugar.ciudad,
      pais: lugar.pais,
      descripcion: busqueda.rubro,
      n_resenas: negocio.n_resenas,
      rating: negocio.rating,
      problemas: problemasPorPlaceId.get(placeId) ?? [],
      email: email?.valor ?? null,
    });
  }
  return [...negocios.values()];
}

function contar(datos: DatosSinAnalisis) {
  let leads = 0;
  let resenas = 0;
  let contactos = 0;
  for (const negocio of datos.negocios) {
    const placeId = negocio.google_place_id;
    leads += datos.leadsPorPlaceId.has(placeId) ? 1 : 0;
    resenas += datos.resenasPorPlaceId.get(placeId)?.length ?? 0;
    contactos += datos.contactosPorPlaceId.get(placeId)?.length ?? 0;
  }
  return { negocios: datos.negocios.length, leads, resenas, contactos };
}

function registrarPrimerAvistamiento(
  primerAvistamiento: Map<string, string>,
  fila: FilaNegocio,
) {
  const primero = primerAvistamiento.get(fila.place_id);
  if (!primero || fila.fecha_extraccion < primero) {
    primerAvistamiento.set(fila.place_id, fila.fecha_extraccion);
  }
}

@Injectable()
export class ImportadorService {
  private readonly logger = new Logger(ImportadorService.name);
  private readonly carpeta: string;

  constructor(
    private readonly repository: ImportadorRepository,
    config: ConfigService<Env, true>,
  ) {
    this.carpeta = `${config.get('SCRAPER_DIR', { infer: true })}/data`;
  }

  async analizarBusqueda(busquedaId: string): Promise<AnalisisBusqueda> {
    const busqueda = await this.exigirBusqueda(busquedaId);
    const negocios = await this.leerNegocios(busqueda);
    const placeIds = new Set(negocios.elegidos.map((fila) => fila.place_id));

    const conFicha = new Set<string>();
    await leerCsv(this.carpeta, 'fichas', this.logger, (fila) => {
      if (placeIds.has(fila.place_id)) {
        conFicha.add(fila.place_id);
      }
    });

    const candidatos = negocios.elegidos.filter(
      (fila) =>
        cumpleFiltros(busqueda, fila.rating, fila.n_resenas) &&
        !conFicha.has(fila.place_id),
    );
    return {
      ubicaciones_sin_filas: negocios.ubicacionesSinFilas,
      candidatos_sin_ficha: candidatos.length,
    };
  }

  async importarBusqueda(
    busquedaId: string,
    gemini: AnalisisGemini,
  ): Promise<ResumenImportacion> {
    const inicio = Date.now();
    this.logger.log(`Importando la búsqueda ${busquedaId}`);
    const busqueda = await this.exigirBusqueda(busquedaId);
    const negocios = await this.leerNegocios(busqueda);
    const placeIds = new Set(negocios.elegidos.map((fila) => fila.place_id));
    const detalles = await this.leerDetalles(
      (archivo, alLeerFila) =>
        leerCsv(this.carpeta, archivo, this.logger, alLeerFila).then(
          (resultado) => resultado.invalidas,
        ),
      placeIds,
      busqueda,
    );

    const nuevos: NegocioNuevo[] = negocios.elegidos.map((fila) => ({
      busqueda_ubicacion_id: fila.busqueda_ubicacion_id,
      ...aNegocio(
        fila,
        detalles.fichas.get(fila.place_id),
        negocios.primerAvistamiento.get(fila.place_id),
      ),
    }));

    const conteos = await this.guardarConAnalisis(
      busqueda,
      {
        negocios: nuevos,
        contactosPorPlaceId: detalles.contactosPorPlaceId,
        resenasPorPlaceId: detalles.resenasPorPlaceId,
        leadsPorPlaceId: detalles.leadsPorPlaceId,
      },
      gemini,
    );
    const resumen: ResumenImportacion = {
      busqueda_id: busquedaId,
      ...conteos,
      filas_invalidas: negocios.invalidas + detalles.invalidas,
      ubicaciones_sin_filas: negocios.ubicacionesSinFilas.length,
    };
    this.logger.log(
      { ...resumen, duracion_ms: Date.now() - inicio },
      'Importación terminada',
    );
    return resumen;
  }

  async prepararArchivos(entrada: unknown): Promise<ArchivosPreparados> {
    const validacion = createImportacionSchema.safeParse(entrada ?? {});
    if (!validacion.success) {
      throw exceptionFactory(validacion.error.issues);
    }
    const archivos = validacion.data;
    const leer: Lector = (archivo, alLeerFila) =>
      leerCsvSubido(archivos[archivo], archivo, this.logger, alLeerFila);

    let subidos: LecturaSubida;
    let detalles: Detalles;
    try {
      subidos = await this.leerNegociosSubidos(leer);
      detalles = await this.leerDetalles(leer, subidos.placeIds, SIN_FILTROS);
    } catch (error) {
      if (error instanceof ColumnasFaltantesError) {
        throw new ValidacionException(MENSAJE_CAMPOS, {
          [error.archivo]: `Le faltan las columnas: ${error.faltantes.join(', ')}.`,
        });
      }
      throw error;
    }

    const busquedas: BusquedaImportada[] = [...subidos.grupos]
      .sort(([a], [b]) => a.localeCompare(b, 'es'))
      .map(([rubro, grupo]) => ({
        rubro,
        lugares: [...grupo.lugares.values()],
        negocios: [...grupo.negocios.values()].map((fila) => ({
          lugar: fila.lugar,
          ...aNegocio(
            fila,
            detalles.fichas.get(fila.place_id),
            subidos.primerAvistamiento.get(fila.place_id),
          ),
        })),
      }));
    return {
      busquedas,
      detalles: {
        contactosPorPlaceId: detalles.contactosPorPlaceId,
        resenasPorPlaceId: detalles.resenasPorPlaceId,
        leadsPorPlaceId: detalles.leadsPorPlaceId,
      },
      invalidas: subidos.invalidas + detalles.invalidas,
    };
  }

  async crearBusquedasImportadas(
    preparados: ArchivosPreparados,
  ): Promise<{ importacion: Importacion; pendientes: BusquedaPendiente[] }> {
    const creadas = await this.repository.crearBusquedasImportadas(
      preparados.busquedas,
      TIMEOUT_IMPORTACION_MS,
    );
    const pendientes = preparados.busquedas.map(
      (busqueda, indice): BusquedaPendiente & { ubicaciones: number } => {
        const creada = creadas.busquedas[indice];
        return {
          id: creada.id,
          rubro: busqueda.rubro,
          ubicaciones: creada.ubicacionPorLugar.size,
          datos: {
            ...preparados.detalles,
            negocios: busqueda.negocios.map(({ lugar, ...negocio }) => {
              const ubicacionId = creada.ubicacionPorLugar.get(lugar);
              if (!ubicacionId) {
                throw new Error(`Falta la ubicación ${lugar}`);
              }
              return { ...negocio, busqueda_ubicacion_id: ubicacionId };
            }),
          },
        };
      },
    );
    const importacion: Importacion = {
      busquedas: pendientes.map((pendiente) => {
        const conteos = contar(pendiente.datos);
        return {
          id: pendiente.id,
          rubro: pendiente.rubro,
          cantidad_ubicaciones: pendiente.ubicaciones,
          cantidad_negocios: conteos.negocios,
          cantidad_leads: conteos.leads,
          cantidad_resenas: conteos.resenas,
          cantidad_contactos: conteos.contactos,
        };
      }),
      ciudades_creadas: creadas.ciudades_creadas,
      filas_invalidas: preparados.invalidas,
    };
    this.logger.log(importacion, 'Búsquedas importadas creadas');
    return {
      importacion,
      pendientes: pendientes.map(({ id, rubro, datos }) => ({
        id,
        rubro,
        datos,
      })),
    };
  }

  async guardarBusquedaImportada(
    pendiente: BusquedaPendiente,
    gemini: AnalisisGemini,
  ): Promise<void> {
    const inicio = Date.now();
    const conteos = await this.guardarConAnalisis(
      await this.exigirBusqueda(pendiente.id),
      pendiente.datos,
      gemini,
    );
    this.logger.log(
      {
        busqueda_id: pendiente.id,
        ...conteos,
        duracion_ms: Date.now() - inicio,
      },
      'Búsqueda importada guardada',
    );
  }

  private async guardarConAnalisis(
    busqueda: BusquedaParaImportar,
    datos: DatosSinAnalisis,
    { detectar, generarCorreos }: AnalisisGemini,
  ) {
    const problemasPorPlaceId = await detectar(resenasParaDetectar(datos));
    const correosPorPlaceId = await generarCorreos(
      negociosParaCorreo(datos, busqueda, problemasPorPlaceId),
    );
    return this.repository.guardar(
      busqueda.id,
      { ...datos, problemasPorPlaceId, correosPorPlaceId },
      TIMEOUT_IMPORTACION_MS,
    );
  }

  private async leerDetalles(
    leer: Lector,
    placeIds: Set<string>,
    filtros: Filtros,
  ): Promise<Detalles> {
    let invalidas = 0;

    const fichas = new Map<string, FilaFicha>();
    invalidas += await leer('fichas', (fila) => {
      if (placeIds.has(fila.place_id) && !fichas.has(fila.place_id)) {
        fichas.set(fila.place_id, fila);
      }
    });

    const resenasPorPlaceId = new Map<string, ResenaNueva[]>();
    invalidas += await leer('resenas', (fila) => {
      if (!placeIds.has(fila.place_id)) {
        return;
      }
      const lista = resenasPorPlaceId.get(fila.place_id) ?? [];
      lista.push({
        autor: fila.autor,
        rating: fila.rating,
        fuente: fila.fuente,
        texto: fila.texto,
        respondida: fila.respondida,
        meses_atras: fila.meses,
        fecha_extraccion: fila.fecha_extraccion,
      });
      resenasPorPlaceId.set(fila.place_id, lista);
    });

    const leadsPorPlaceId = new Map<string, LeadNuevo>();
    invalidas += await leer('leads', (fila) => {
      if (
        placeIds.has(fila.place_id) &&
        !leadsPorPlaceId.has(fila.place_id) &&
        cumpleFiltros(filtros, fila.rating, fila.n_resenas)
      ) {
        leadsPorPlaceId.set(fila.place_id, {
          prioridad: fila.prioridad,
          percentil: fila.percentil,
          tendencia: fila.tendencia,
          variacion_rating: fila.variacion_rating,
        });
      }
    });

    const contactosPorPlaceId = new Map<string, ContactoNuevo[]>();
    for (const [placeId, ficha] of fichas) {
      contactosPorPlaceId.set(placeId, contactosDe(ficha));
    }

    return {
      fichas,
      contactosPorPlaceId,
      resenasPorPlaceId,
      leadsPorPlaceId,
      invalidas,
    };
  }

  private async leerNegociosSubidos(leer: Lector): Promise<LecturaSubida> {
    const grupos = new Map<string, GrupoRubro>();
    const primerAvistamiento = new Map<string, string>();
    const noSoportados = new Set<string>();

    const invalidas = await leer('negocios', (fila) => {
      if (!(PAISES_SCRAPER as readonly string[]).includes(fila.pais)) {
        noSoportados.add(fila.pais);
        return;
      }
      registrarPrimerAvistamiento(primerAvistamiento, fila);

      const grupo = grupos.get(fila.descripcion) ?? {
        lugares: new Map<string, LugarImportado>(),
        negocios: new Map<string, NegocioSubido>(),
      };
      grupos.set(fila.descripcion, grupo);
      const lugar = `${fila.ciudad}|${fila.pais}`;
      if (!grupo.lugares.has(lugar)) {
        grupo.lugares.set(lugar, {
          clave: lugar,
          ciudad: fila.ciudad,
          pais: fila.pais,
        });
      }
      const clave = `${lugar}|${fila.place_id}`;
      const anterior = grupo.negocios.get(clave);
      if (!anterior || fila.fecha_extraccion >= anterior.fecha_extraccion) {
        grupo.negocios.set(clave, { ...fila, lugar });
      }
    });

    if (noSoportados.size > 0) {
      throw new ValidacionException(MENSAJE_CAMPOS, {
        negocios: `Tiene países que el scraper no admite: ${[...noSoportados].sort().join(', ')}.`,
      });
    }
    if (grupos.size === 0) {
      throw new ValidacionException(MENSAJE_CAMPOS, {
        negocios: 'El archivo no tiene negocios válidos.',
      });
    }

    const placeIds = new Set<string>();
    for (const grupo of grupos.values()) {
      for (const fila of grupo.negocios.values()) {
        placeIds.add(fila.place_id);
      }
    }
    return { grupos, primerAvistamiento, placeIds, invalidas };
  }

  private async exigirBusqueda(busquedaId: string) {
    const busqueda = await this.repository.obtenerBusqueda(busquedaId);
    if (!busqueda) {
      throw new Error(`No existe la búsqueda ${busquedaId}`);
    }
    return busqueda;
  }

  private async leerNegocios(
    busqueda: BusquedaParaImportar,
  ): Promise<LecturaNegocios> {
    const desde = fechaLocal(busqueda.creada_en);
    const hasta = fechaLocal(new Date());
    const ubicacionPorLugar = new Map(
      busqueda.ubicaciones.map((ubicacion) => [
        `${ubicacion.ciudad.normalize('NFC')}|${ubicacion.pais.normalize('NFC')}`,
        ubicacion.id,
      ]),
    );
    const ubicacionPorLugarSinTildes = new Map(
      busqueda.ubicaciones.map((ubicacion) => [
        `${sinTildes(ubicacion.ciudad)}|${sinTildes(ubicacion.pais)}`,
        ubicacion.id,
      ]),
    );

    const elegidos = new Map<string, NegocioElegido>();
    const primerAvistamiento = new Map<string, string>();
    const parecidas = new Map<string, string[]>();

    const { invalidas } = await leerCsv(
      this.carpeta,
      'negocios',
      this.logger,
      (fila) => {
        registrarPrimerAvistamiento(primerAvistamiento, fila);

        if (
          fila.descripcion !== busqueda.rubro ||
          fila.fecha_extraccion < desde ||
          fila.fecha_extraccion > hasta
        ) {
          return;
        }
        const ubicacionId = ubicacionPorLugar.get(
          `${fila.ciudad}|${fila.pais}`,
        );
        if (!ubicacionId) {
          const parecida = ubicacionPorLugarSinTildes.get(
            `${sinTildes(fila.ciudad)}|${sinTildes(fila.pais)}`,
          );
          if (parecida) {
            const ejemplos = parecidas.get(parecida) ?? [];
            ejemplos.push(`${fila.ciudad}, ${fila.pais}`);
            parecidas.set(parecida, ejemplos);
          }
          return;
        }

        const clave = `${ubicacionId}|${fila.place_id}`;
        const anterior = elegidos.get(clave);
        if (!anterior || fila.fecha_extraccion >= anterior.fecha_extraccion) {
          elegidos.set(clave, { ...fila, busqueda_ubicacion_id: ubicacionId });
        }
      },
    );

    const conFilas = new Set(
      [...elegidos.values()].map((fila) => fila.busqueda_ubicacion_id),
    );
    const ubicacionesSinFilas = busqueda.ubicaciones
      .filter((ubicacion) => !conFilas.has(ubicacion.id))
      .map((ubicacion) => ubicacion.id);

    for (const ubicacionId of ubicacionesSinFilas) {
      const ejemplos = parecidas.get(ubicacionId);
      if (ejemplos) {
        this.logger.warn(
          `Posible diferencia de tildes en la búsqueda ${busqueda.id}: ${[...new Set(ejemplos)].slice(0, MAX_EJEMPLOS_TILDES).join('; ')}`,
        );
      }
    }

    return {
      elegidos: [...elegidos.values()],
      primerAvistamiento,
      ubicacionesSinFilas,
      invalidas,
    };
  }
}
