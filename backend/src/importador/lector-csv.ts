import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
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

type FilaDe<A extends Archivo> = ReturnType<(typeof ESQUEMAS)[A]['parse']>;

export type ResultadoLectura = { existe: boolean; invalidas: number };

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
  const nombre = ARCHIVOS[archivo];
  const ruta = `${carpeta}/${nombre}`;
  if (!(await existe(ruta))) {
    return { existe: false, invalidas: 0 };
  }

  const esquema = ESQUEMAS[archivo];
  let numero = 0;
  let invalidas = 0;

  await pipeline(
    createReadStream(ruta, { encoding: 'utf8' }),
    Papa.parse(Papa.NODE_STREAM_INPUT, { header: true, skipEmptyLines: true }),
    async function (filas: AsyncIterable<Record<string, string>>) {
      for await (const fila of filas) {
        numero += 1;
        if (numero === 1) {
          const faltantes = COLUMNAS_OBLIGATORIAS[archivo].filter(
            (columna) => !(columna in fila),
          );
          if (faltantes.length > 0) {
            throw new Error(
              `A ${nombre} le faltan las columnas: ${faltantes.join(', ')}`,
            );
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

  return { existe: true, invalidas };
}
