import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

export type Pais = { id: string; nombre: string };
export type Ciudad = { id: string; pais_id: string; nombre: string };

function escaparLike(texto: string) {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

@Injectable()
export class CatalogosRepository {
  constructor(private readonly prisma: PrismaService) {}

  listarPaises(): Promise<Pais[]> {
    return this.prisma.pais.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async existePais(id: string): Promise<boolean> {
    const pais = await this.prisma.pais.findUnique({
      where: { id },
      select: { id: true },
    });
    return pais !== null;
  }

  buscarCiudades(
    paisId: string,
    texto: string,
    limite: number,
  ): Promise<Ciudad[]> {
    const patron = `${escaparLike(texto)}%`;
    return this.prisma.$queryRaw<Ciudad[]>`
      SELECT id, pais_id, nombre
      FROM ciudades
      WHERE pais_id = ${paisId}::uuid
        AND unaccent(nombre) ILIKE unaccent(${patron})
      ORDER BY nombre
      LIMIT ${limite}
    `;
  }

  async buscarCiudadIgual(
    paisId: string,
    nombre: string,
  ): Promise<Ciudad | null> {
    const filas = await this.prisma.$queryRaw<Ciudad[]>`
      SELECT id, pais_id, nombre
      FROM ciudades
      WHERE pais_id = ${paisId}::uuid
        AND unaccent(lower(nombre)) = unaccent(lower(${nombre}))
      LIMIT 1
    `;
    return filas[0] ?? null;
  }

  crearCiudad(paisId: string, nombre: string): Promise<Ciudad> {
    return this.prisma.ciudad.create({
      data: { pais_id: paisId, nombre },
      select: { id: true, pais_id: true, nombre: true },
    });
  }
}
