import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cumpleFiltros } from '../common/busqueda.js';
import type { Env } from '../config/env.schema.js';
import {
  COLUMNAS_REDES,
  SEPARADOR_LISTA,
  type FilaFicha,
  type FilaNegocio,
} from './columnas-scraper.js';
import {
  ImportadorRepository,
  type BusquedaParaImportar,
  type ContactoNuevo,
  type LeadNuevo,
  type NegocioNuevo,
  type ResenaNueva,
} from './importador.repository.js';
import { leerCsv } from './lector-csv.js';

const TIMEOUT_IMPORTACION_MS = 120_000;
const MAX_EJEMPLOS_TILDES = 5;

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

type NegocioElegido = FilaNegocio & { busqueda_ubicacion_id: string };

type LecturaNegocios = {
  elegidos: NegocioElegido[];
  primerAvistamiento: Map<string, string>;
  ubicacionesSinFilas: string[];
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

  async importarBusqueda(busquedaId: string): Promise<ResumenImportacion> {
    const inicio = Date.now();
    this.logger.log(`Importando la búsqueda ${busquedaId}`);
    const busqueda = await this.exigirBusqueda(busquedaId);
    const negocios = await this.leerNegocios(busqueda);
    const placeIds = new Set(negocios.elegidos.map((fila) => fila.place_id));
    let invalidas = negocios.invalidas;

    const fichas = new Map<string, FilaFicha>();
    invalidas += (
      await leerCsv(this.carpeta, 'fichas', this.logger, (fila) => {
        if (placeIds.has(fila.place_id) && !fichas.has(fila.place_id)) {
          fichas.set(fila.place_id, fila);
        }
      })
    ).invalidas;

    const resenasPorPlaceId = new Map<string, ResenaNueva[]>();
    invalidas += (
      await leerCsv(this.carpeta, 'resenas', this.logger, (fila) => {
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
      })
    ).invalidas;

    const leadsPorPlaceId = new Map<string, LeadNuevo>();
    invalidas += (
      await leerCsv(this.carpeta, 'leads', this.logger, (fila) => {
        if (
          placeIds.has(fila.place_id) &&
          !leadsPorPlaceId.has(fila.place_id) &&
          cumpleFiltros(busqueda, fila.rating, fila.n_resenas)
        ) {
          leadsPorPlaceId.set(fila.place_id, {
            prioridad: fila.prioridad,
            percentil: fila.percentil,
            tendencia: fila.tendencia,
            variacion_rating: fila.variacion_rating,
          });
        }
      })
    ).invalidas;

    const contactosPorPlaceId = new Map<string, ContactoNuevo[]>();
    for (const [placeId, ficha] of fichas) {
      contactosPorPlaceId.set(placeId, contactosDe(ficha));
    }

    const nuevos: NegocioNuevo[] = negocios.elegidos.map((fila) => {
      const ficha = fichas.get(fila.place_id);
      return {
        busqueda_ubicacion_id: fila.busqueda_ubicacion_id,
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
        primer_avistamiento:
          negocios.primerAvistamiento.get(fila.place_id) ?? null,
        url_google_maps: fila.url,
        fecha_extraccion: fila.fecha_extraccion,
      };
    });

    const conteos = await this.repository.guardar(
      busquedaId,
      {
        negocios: nuevos,
        contactosPorPlaceId,
        resenasPorPlaceId,
        leadsPorPlaceId,
      },
      TIMEOUT_IMPORTACION_MS,
    );
    const resumen: ResumenImportacion = {
      busqueda_id: busquedaId,
      ...conteos,
      filas_invalidas: invalidas,
      ubicaciones_sin_filas: negocios.ubicacionesSinFilas.length,
    };
    this.logger.log(
      { ...resumen, duracion_ms: Date.now() - inicio },
      'Importación terminada',
    );
    return resumen;
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
        const primero = primerAvistamiento.get(fila.place_id);
        if (!primero || fila.fecha_extraccion < primero) {
          primerAvistamiento.set(fila.place_id, fila.fecha_extraccion);
        }

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
