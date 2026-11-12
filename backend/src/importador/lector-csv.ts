import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Logger } from '@nestjs/common';
import Papa from 'papaparse';
import {
  ARCHIVOS,
  COLUMNAS_OBLIGATORIAS,
  ESQUEMAS,
  type Archivo,
} from './columnas-scraper.js';

const MAX_EJEMPLOS = 10;

export type FilaDe<A extends Archivo> = ReturnType<
  (typeof ESQUEMAS)[A]['parse']
>;

export type ResultadoLectura = { existe: boolean; invalidas: number };

export class ColumnasFaltantesError extends Error {
  constructor(
    readonly archivo: Archivo,
    readonly faltantes: string[],
  ) {
    super(
      `A ${ARCHIVOS[archivo]} le faltan las columnas: ${faltantes.join(', ')}`,
    );
  }
}

async function existe(ruta: string) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

export async function leerCsv<A extends Archivo>(
  carpeta: string,
  archivo: A,
  logger: Logger,
  alLeerFila: (fila: FilaDe<A>) => void,
): Promise<ResultadoLectura> {
  const ruta = `${carpeta}/${ARCHIVOS[archivo]}`;
  if (!(await existe(ruta))) {
    return { existe: false, invalidas: 0 };
  }
  const invalidas = await leerFilas(
    createReadStream(ruta, { encoding: 'utf8' }),
    archivo,
    logger,
    alLeerFila,
  );
  return { existe: true, invalidas };
}

export function leerCsvSubido<A extends Archivo>(
  contenido: Buffer,
  archivo: A,
  logger: Logger,
  alLeerFila: (fila: FilaDe<A>) => void,
): Promise<number> {
  return leerFilas(
    Readable.from([contenido.toString('utf8')]),
    archivo,
    logger,
    alLeerFila,
  );
}

async function leerFilas<A extends Archivo>(
  entrada: Readable,
  archivo: A,
  logger: Logger,
  alLeerFila: (fila: FilaDe<A>) => void,
): Promise<number> {
  const nombre = ARCHIVOS[archivo];
  const esquema = ESQUEMAS[archivo];
  let numero = 0;
  let invalidas = 0;

  await pipeline(
    entrada,
    Papa.parse(Papa.NODE_STREAM_INPUT, { header: true, skipEmptyLines: true }),
    async function (filas: AsyncIterable<Record<string, string>>) {
      for await (const fila of filas) {
        numero += 1;
        if (numero === 1) {
          const faltantes = COLUMNAS_OBLIGATORIAS[archivo].filter(
            (columna) => !(columna in fila),
          );
          if (faltantes.length > 0) {
            throw new ColumnasFaltantesError(archivo, faltantes);
          }
        }
        const resultado = esquema.safeParse(fila);
        if (resultado.success) {
          alLeerFila(resultado.data as FilaDe<A>);
          continue;
        }
        invalidas += 1;
        if (invalidas <= MAX_EJEMPLOS) {
          const problema = resultado.error.issues[0];
          logger.warn(
            `${nombre}, registro ${numero}: ${problema.path.join('.')} ${problema.message}`,
          );
        }
      }
    },
  );

  return invalidas;
}
