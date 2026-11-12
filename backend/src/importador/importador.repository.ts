import { Injectable } from '@nestjs/common';
import type { Filtros } from '../common/busqueda.js';
import type { CorreoGenerado } from '../common/correos.js';
import { RATING_NEGATIVA } from '../common/problemas.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

const TAMANO_LOTE = 1000;

export type BusquedaParaImportar = Filtros & {
  id: string;
  rubro: string;
  creada_en: Date;
  ubicaciones: { id: string; ciudad: string; pais: string }[];
};

export type NegocioNuevo = {
  busqueda_ubicacion_id: string;
  google_place_id: string;
  nombre: string;
  direccion: string | null;
  rating: number | null;
  n_resenas: number | null;
  hist_5: number | null;
  hist_4: number | null;
  hist_3: number | null;
  hist_2: number | null;
  hist_1: number | null;
  pct_negativas: number | null;
  primer_avistamiento: string | null;
  url_google_maps: string | null;
  fecha_extraccion: string | null;
};

export type ContactoNuevo = {
  tipo: string;
  subtipo: string | null;
  valor: string;
  fuente: string;
};

export type ResenaNueva = {
  autor: string | null;
  rating: number | null;
  fuente: string | null;
  texto: string | null;
  respondida: boolean | null;
  meses_atras: number | null;
  fecha_extraccion: string | null;
};

export type LeadNuevo = {
  prioridad: string | null;
  percentil: number | null;
  tendencia: string | null;
  variacion_rating: number | null;
};

export type DatosImportacion = {
  negocios: NegocioNuevo[];
  contactosPorPlaceId: Map<string, ContactoNuevo[]>;
  resenasPorPlaceId: Map<string, ResenaNueva[]>;
  leadsPorPlaceId: Map<string, LeadNuevo>;
  problemasPorPlaceId: Map<string, string[]>;
  correosPorPlaceId: Map<string, CorreoGenerado>;
};

export type DatosSinAnalisis = Omit<
  DatosImportacion,
  'problemasPorPlaceId' | 'correosPorPlaceId'
>;

export type Conteos = {
  negocios: number;
  leads: number;
  resenas: number;
  contactos: number;
};

export type DetallesImportacion = Omit<DatosSinAnalisis, 'negocios'>;

export type LugarImportado = { clave: string; ciudad: string; pais: string };

export type NegocioImportado = Omit<NegocioNuevo, 'busqueda_ubicacion_id'> & {
  lugar: string;
};

export type BusquedaImportada = {
  rubro: string;
  lugares: LugarImportado[];
  negocios: NegocioImportado[];
};

export type BusquedaCreada = {
  id: string;
  ubicacionPorLugar: Map<string, string>;
};

export type BusquedasCreadas = {
  busquedas: BusquedaCreada[];
  ciudades_creadas: number;
};

type Transaccion = Prisma.TransactionClient;

function aFecha(valor: string | null) {
  return valor === null ? null : new Date(`${valor}T00:00:00.000Z`);
}

function enLotes<T>(filas: T[]): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
    lotes.push(filas.slice(i, i + TAMANO_LOTE));
  }
  return lotes;
}

function exigir<K, V>(mapa: Map<K, V>, clave: K): V {
  const valor = mapa.get(clave);
  if (valor === undefined) {
    throw new Error(`Falta la clave ${String(clave)}`);
  }
  return valor;
}

@Injectable()
export class ImportadorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerBusqueda(id: string): Promise<BusquedaParaImportar | null> {
    const fila = await this.prisma.busqueda.findUnique({
      where: { id },
      select: {
        id: true,
        rubro: true,
        rating_minimo: true,
        rating_maximo: true,
        min_resenas: true,
        creada_en: true,
        ubicaciones: {
          select: {
            id: true,
            ciudad: {
              select: { nombre: true, pais: { select: { nombre: true } } },
            },
          },
        },
      },
    });
    if (!fila) {
      return null;
    }
    return {
      id: fila.id,
      rubro: fila.rubro,
      rating_minimo: fila.rating_minimo?.toNumber() ?? null,
      rating_maximo: fila.rating_maximo?.toNumber() ?? null,
      min_resenas: fila.min_resenas,
      creada_en: fila.creada_en,
      ubicaciones: fila.ubicaciones.map((ubicacion) => ({
        id: ubicacion.id,
        ciudad: ubicacion.ciudad.nombre,
        pais: ubicacion.ciudad.pais.nombre,
      })),
    };
  }

  async guardar(
    busquedaId: string,
    datos: DatosImportacion,
    timeout: number,
  ): Promise<Conteos> {
    return this.prisma.$transaction(
      async (tx) => {
        const existentes = await tx.negocio.count({
          where: { ubicacion: { busqueda_id: busquedaId } },
        });
        if (existentes > 0) {
          throw new Error('La búsqueda ya tiene negocios importados');
        }
        return this.insertarResultados(tx, busquedaId, datos);
      },
      { timeout, maxWait: 10_000 },
    );
  }

  async crearBusquedasImportadas(
    busquedas: Pick<BusquedaImportada, 'rubro' | 'lugares'>[],
    timeout: number,
  ): Promise<BusquedasCreadas> {
    return this.prisma.$transaction(
      async (tx) => {
        const lugares = new Map<string, LugarImportado>();
        for (const busqueda of busquedas) {
          for (const lugar of busqueda.lugares) {
            lugares.set(lugar.clave, lugar);
          }
        }
        const { ciudadPorLugar, creadas } = await this.resolverCiudades(tx, [
          ...lugares.values(),
        ]);

        const creadasBusquedas: BusquedaCreada[] = [];
        for (const busqueda of busquedas) {
          const ciudadIds = [
            ...new Set(
              busqueda.lugares.map((lugar) =>
                exigir(ciudadPorLugar, lugar.clave),
              ),
            ),
          ];
          const creada = await tx.busqueda.create({
            data: {
              rubro: busqueda.rubro,
              estado: 'en_curso',
              ubicaciones: {
                create: ciudadIds.map((ciudad_id) => ({ ciudad_id })),
              },
            },
            select: {
              id: true,
              ubicaciones: { select: { id: true, ciudad_id: true } },
            },
          });
          const ubicacionPorCiudad = new Map(
            creada.ubicaciones.map((ubicacion) => [
              ubicacion.ciudad_id,
              ubicacion.id,
            ]),
          );
          creadasBusquedas.push({
            id: creada.id,
            ubicacionPorLugar: new Map(
              busqueda.lugares.map((lugar) => [
                lugar.clave,
                exigir(ubicacionPorCiudad, exigir(ciudadPorLugar, lugar.clave)),
              ]),
            ),
          });
        }
        return { busquedas: creadasBusquedas, ciudades_creadas: creadas };
      },
      { timeout, maxWait: 10_000 },
    );
  }

  private async resolverCiudades(tx: Transaccion, lugares: LugarImportado[]) {
    const paisPorNombre = new Map(
      (await tx.pais.findMany({ select: { id: true, nombre: true } })).map(
        (pais) => [pais.nombre, pais.id],
      ),
    );
    const ciudadPorLugar = new Map<string, string>();
    let creadas = 0;
    for (const lugar of lugares) {
      const paisId = paisPorNombre.get(lugar.pais);
      if (!paisId) {
        throw new Error(`No existe el país ${lugar.pais} en la base`);
      }
      const [existente] = await tx.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM ciudades
        WHERE pais_id = ${paisId}::uuid
          AND unaccent(lower(nombre)) = unaccent(lower(${lugar.ciudad}))
        ORDER BY (nombre = ${lugar.ciudad}) DESC, nombre
        LIMIT 1
      `;
      if (existente) {
        ciudadPorLugar.set(lugar.clave, existente.id);
        continue;
      }
      const nueva = await tx.ciudad.create({
        data: { pais_id: paisId, nombre: lugar.ciudad },
        select: { id: true },
      });
      ciudadPorLugar.set(lugar.clave, nueva.id);
      creadas += 1;
    }
    return { ciudadPorLugar, creadas };
  }

  private async insertarResultados(
    tx: Transaccion,
    busquedaId: string,
    datos: DatosImportacion,
  ): Promise<Conteos> {
    const insertados: { id: string; google_place_id: string }[] = [];
    for (const lote of enLotes(datos.negocios)) {
      insertados.push(
        ...(await tx.negocio.createManyAndReturn({
          data: lote.map((negocio) => ({
            ...negocio,
            primer_avistamiento: aFecha(negocio.primer_avistamiento),
            fecha_extraccion: aFecha(negocio.fecha_extraccion),
          })),
          select: { id: true, google_place_id: true },
        })),
      );
    }

    const contactos: Prisma.NegocioContactoCreateManyInput[] = [];
    const resenas: Prisma.ResenaCreateManyInput[] = [];
    const leads: Prisma.LeadCreateManyInput[] = [];
    for (const negocio of insertados) {
      const placeId = negocio.google_place_id;
      for (const contacto of datos.contactosPorPlaceId.get(placeId) ?? []) {
        contactos.push({ ...contacto, negocio_id: negocio.id });
      }
      for (const resena of datos.resenasPorPlaceId.get(placeId) ?? []) {
        resenas.push({
          ...resena,
          negocio_id: negocio.id,
          fecha_extraccion: aFecha(resena.fecha_extraccion),
        });
      }
      const lead = datos.leadsPorPlaceId.get(placeId);
      if (lead) {
        leads.push({ ...lead, negocio_id: negocio.id });
      }
    }

    for (const lote of enLotes(contactos)) {
      await tx.negocioContacto.createMany({ data: lote });
    }
    for (const lote of enLotes(resenas)) {
      await tx.resena.createMany({ data: lote });
    }
    const placeIdPorNegocio = new Map(
      insertados.map((negocio) => [negocio.id, negocio.google_place_id]),
    );
    const problemas: Prisma.NegocioProblemaCreateManyInput[] = [];
    const correos: Prisma.LeadCorreoCreateManyInput[] = [];
    const generadoEn = new Date();
    for (const lote of enLotes(leads)) {
      const creados = await tx.lead.createManyAndReturn({
        data: lote,
        select: { id: true, negocio_id: true },
      });
      for (const lead of creados) {
        const placeId = exigir(placeIdPorNegocio, lead.negocio_id);
        (datos.problemasPorPlaceId.get(placeId) ?? []).forEach(
          (problema, indice) =>
            problemas.push({
              lead_id: lead.id,
              orden: indice + 1,
              problema,
              generado_en: generadoEn,
            }),
        );
        const correo = datos.correosPorPlaceId.get(placeId);
        if (correo) {
          correos.push({
            lead_id: lead.id,
            asunto: correo.asunto,
            cuerpo: correo.cuerpo,
            generado_en: generadoEn,
          });
        }
      }
    }
    for (const lote of enLotes(problemas)) {
      await tx.negocioProblema.createMany({ data: lote });
    }
    for (const lote of enLotes(correos)) {
      await tx.leadCorreo.createMany({ data: lote });
    }

    const ids = insertados.map((negocio) => negocio.id);
    await tx.$executeRaw`
      UPDATE resenas
      SET fecha_aprox = (fecha_extraccion - make_interval(months => meses_atras))::date
      WHERE negocio_id = ANY(${ids}::uuid[])
        AND meses_atras IS NOT NULL
        AND fecha_extraccion IS NOT NULL
    `;

    await tx.busquedaResultado.create({
      data: {
        busqueda_id: busquedaId,
        cantidad_negocios: insertados.length,
        cantidad_leads: leads.length,
        cantidad_resenas: resenas.length,
        cantidad_resenas_negativas: resenas.filter(
          (resena) =>
            resena.rating !== null &&
            resena.rating !== undefined &&
            resena.rating <= RATING_NEGATIVA,
        ).length,
      },
    });

    return {
      negocios: insertados.length,
      leads: leads.length,
      resenas: resenas.length,
      contactos: contactos.length,
    };
  }
}
