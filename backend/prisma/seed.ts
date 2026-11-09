import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import Papa from 'papaparse';
import { PAISES_SCRAPER } from '../src/common/paises-scraper.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const ATRIBUCION =
  'Datos de países y ciudades: GeoNames (https://www.geonames.org), licencia CC BY 4.0';

const RUTA_CIUDADES = new URL(
  '../../database/seed/ciudades.csv',
  import.meta.url,
);
const TAMANO_LOTE = 1000;

type FilaCiudad = { pais: string; nombre: string };

const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error('Falta DATABASE_URL en backend/.env');
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const inicio = Date.now();
  const lectura = Papa.parse<FilaCiudad>(
    await readFile(RUTA_CIUDADES, 'utf8'),
    {
      header: true,
      skipEmptyLines: true,
    },
  );
  if (lectura.errors.length > 0) {
    throw new Error(
      `ciudades.csv tiene errores: ${JSON.stringify(lectura.errors.slice(0, 3))}`,
    );
  }
  const filas = lectura.data;

  const { paisesNuevos, ciudadesNuevas } = await prisma.$transaction(
    async (tx) => {
      const paises = await tx.pais.createMany({
        data: PAISES_SCRAPER.map((nombre) => ({ nombre })),
        skipDuplicates: true,
      });

      const idPorNombre = new Map(
        (await tx.pais.findMany({ select: { id: true, nombre: true } })).map(
          (pais) => [pais.nombre, pais.id],
        ),
      );
      const ciudades = filas.map((fila) => {
        const pais_id = idPorNombre.get(fila.pais);
        if (!pais_id) {
          throw new Error(`País desconocido en ciudades.csv: ${fila.pais}`);
        }
        return { pais_id, nombre: fila.nombre };
      });

      let insertadas = 0;
      for (let i = 0; i < ciudades.length; i += TAMANO_LOTE) {
        const { count } = await tx.ciudad.createMany({
          data: ciudades.slice(i, i + TAMANO_LOTE),
          skipDuplicates: true,
        });
        insertadas += count;
      }
      return { paisesNuevos: paises.count, ciudadesNuevas: insertadas };
    },
    { timeout: 120_000 },
  );

  console.log(
    `Países nuevos: ${paisesNuevos}. Ciudades nuevas: ${ciudadesNuevas} de ${filas.length} del CSV. Duración: ${Date.now() - inicio} ms.`,
  );
  console.log(ATRIBUCION);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
