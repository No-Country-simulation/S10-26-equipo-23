import { Injectable } from '@nestjs/common';
import type { EstadoBusqueda, EstadoFinal } from '../common/busqueda.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';

export type UbicacionConCiudad = {
  id: string;
  ciudad: { id: string; nombre: string; pais: { id: string; nombre: string } };
};

export type Busqueda = {
  id: string;
  rubro: string;
  rating_minimo: number | null;
  rating_maximo: number | null;
  min_resenas: number | null;
  estado: EstadoBusqueda;
  creada_en: Date;
  finalizada_en: Date | null;
  error: string | null;
  ubicaciones: UbicacionConCiudad[];
  resultados: {
    cantidad_negocios: number;
    cantidad_leads: number;
    cantidad_resenas: number;
    cantidad_resenas_negativas: number;
    capturado_en: Date;
  } | null;
};

export type NuevaBusqueda = {
  rubro: string;
  rating_minimo: number | null;
  rating_maximo: number | null;
  min_resenas: number | null;
  ciudadIds: string[];
};

const SELECCION = {
  id: true,
  rubro: true,
  rating_minimo: true,
  rating_maximo: true,
  min_resenas: true,
  estado: true,
  creada_en: true,
  finalizada_en: true,
  error: true,
  ubicaciones: {
    select: {
      id: true,
      ciudad: {
        select: {
          id: true,
          nombre: true,
          pais: { select: { id: true, nombre: true } },
        },
      },
    },
    orderBy: [
      { ciudad: { pais: { nombre: 'asc' } } },
      { ciudad: { nombre: 'asc' } },
    ],
  },
  resultados: {
    select: {
      cantidad_negocios: true,
      cantidad_leads: true,
      cantidad_resenas: true,
      cantidad_resenas_negativas: true,
      capturado_en: true,
    },
  },
} as const satisfies Prisma.BusquedaSelect;

type Fila = Prisma.BusquedaGetPayload<{ select: typeof SELECCION }>;

function aBusqueda(fila: Fila): Busqueda {
  return {
    ...fila,
    rating_minimo: fila.rating_minimo?.toNumber() ?? null,
    rating_maximo: fila.rating_maximo?.toNumber() ?? null,
    estado: fila.estado as EstadoBusqueda,
    resultados: fila.estado === 'completada' ? fila.resultados : null,
  };
}

@Injectable()
export class BusquedasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<Busqueda[]> {
    const filas = await this.prisma.busqueda.findMany({
      select: SELECCION,
      orderBy: { creada_en: 'desc' },
    });
    return filas.map(aBusqueda);
  }

  async obtener(id: string): Promise<Busqueda | null> {
    const fila = await this.prisma.busqueda.findUnique({
      where: { id },
      select: SELECCION,
    });
    return fila ? aBusqueda(fila) : null;
  }

  async hayEnCurso(): Promise<boolean> {
    const cantidad = await this.prisma.busqueda.count({
      where: { estado: 'en_curso' },
    });
    return cantidad > 0;
  }

  async ciudadesExistentes(ids: string[]): Promise<Set<string>> {
    const filas = await this.prisma.ciudad.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(filas.map((fila) => fila.id));
  }

  async crear(datos: NuevaBusqueda): Promise<Busqueda> {
    const fila = await this.prisma.busqueda.create({
      data: {
        rubro: datos.rubro,
        rating_minimo: datos.rating_minimo,
        rating_maximo: datos.rating_maximo,
        min_resenas: datos.min_resenas,
        estado: 'en_curso',
        ubicaciones: {
          create: datos.ciudadIds.map((ciudad_id) => ({ ciudad_id })),
        },
      },
      select: SELECCION,
    });
    return aBusqueda(fila);
  }

  async finalizar(
    id: string,
    estado: EstadoFinal,
    error: string | null = null,
  ): Promise<boolean> {
    const { count } = await this.prisma.busqueda.updateMany({
      where: { id, estado: 'en_curso' },
      data: { estado, error, finalizada_en: new Date() },
    });
    return count > 0;
  }

  async marcarInterrumpidas(error: string): Promise<number> {
    const { count } = await this.prisma.busqueda.updateMany({
      where: { estado: 'en_curso' },
      data: { estado: 'fallida', error, finalizada_en: new Date() },
    });
    return count;
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.busqueda.delete({ where: { id } });
  }
}
