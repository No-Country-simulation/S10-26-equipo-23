import { z } from 'zod';

export const ARCHIVOS = {
  negocios: 'negocios_11.csv',
  fichas: 'fichas_11.csv',
  resenas: 'resenas_11.csv',
  leads: 'leads_11.csv',
} as const;

export type Archivo = keyof typeof ARCHIVOS;

const celda = z
  .string()
  .optional()
  .transform((valor) => valor ?? '');

const texto = celda.transform((valor) =>
  valor === '' ? null : valor.normalize('NFC'),
);

const textoObligatorio = celda
  .refine((valor) => valor !== '', { error: 'Campo vacío' })
  .transform((valor) => valor.normalize('NFC'));

const numero = celda.transform((valor, ctx) => {
  if (valor === '') {
    return null;
  }
  const convertido = Number(valor);
  if (Number.isNaN(convertido)) {
    ctx.addIssue({ code: 'custom', message: `«${valor}» no es un número` });
    return z.NEVER;
  }
  return convertido;
});

const entero = numero.refine(
  (valor) => valor === null || Number.isInteger(valor),
  { error: 'No es un número entero' },
);

const booleano = celda.transform((valor, ctx) => {
  if (valor === '') {
    return null;
  }
  if (valor === 'True' || valor === 'False') {
    return valor === 'True';
  }
  ctx.addIssue({ code: 'custom', message: `«${valor}» no es True ni False` });
  return z.NEVER;
});

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fecha = celda.transform((valor, ctx) => {
  if (valor === '') {
    return null;
  }
  if (!PATRON_FECHA.test(valor)) {
    ctx.addIssue({ code: 'custom', message: `«${valor}» no es una fecha` });
    return z.NEVER;
  }
  return valor;
});

const fechaObligatoria = fecha.refine((valor) => valor !== null, {
  error: 'Campo vacío',
});

export const ESQUEMAS = {
  negocios: z.object({
    place_id: textoObligatorio,
    nombre: textoObligatorio,
    rating: numero,
    n_resenas: entero,
    url: texto,
    descripcion: textoObligatorio,
    ciudad: textoObligatorio,
    pais: textoObligatorio,
    fecha_extraccion: fechaObligatoria.transform((valor) => valor as string),
  }),
  fichas: z.object({
    place_id: textoObligatorio,
    direccion: texto,
    hist_5: entero,
    hist_4: entero,
    hist_3: entero,
    hist_2: entero,
    hist_1: entero,
    pct_negativas: numero,
    telefono: texto,
    tipo_telefono: texto,
    web: texto,
    tipo_web: texto,
    emails_web: texto,
    celulares_web: texto,
    facebook: texto,
    instagram: texto,
    tiktok: texto,
    x: texto,
    youtube: texto,
    linkedin: texto,
  }),
  resenas: z.object({
    place_id: textoObligatorio,
    autor: texto,
    rating: entero,
    fuente: texto,
    texto: texto,
    respondida: booleano,
    meses: entero,
    fecha_extraccion: fecha,
  }),
  leads: z.object({
    place_id: textoObligatorio,
    rating: numero,
    n_resenas: entero,
    prioridad: texto,
    percentil: numero,
    tendencia: texto,
    variacion_rating: numero,
  }),
} satisfies Record<Archivo, z.ZodType>;

export type FilaNegocio = z.infer<typeof ESQUEMAS.negocios>;
export type FilaFicha = z.infer<typeof ESQUEMAS.fichas>;
export type FilaResena = z.infer<typeof ESQUEMAS.resenas>;
export type FilaLead = z.infer<typeof ESQUEMAS.leads>;

function obligatorias(esquema: z.ZodObject, opcionales: string[] = []) {
  return Object.keys(esquema.shape).filter(
    (columna) => !opcionales.includes(columna),
  );
}

export const COLUMNAS_OBLIGATORIAS: Record<Archivo, string[]> = {
  negocios: obligatorias(ESQUEMAS.negocios),
  fichas: obligatorias(ESQUEMAS.fichas),
  resenas: obligatorias(ESQUEMAS.resenas),
  leads: obligatorias(ESQUEMAS.leads, ['variacion_rating']),
};

export const SEPARADOR_LISTA = '; ';

export const COLUMNAS_REDES = [
  'facebook',
  'instagram',
  'tiktok',
  'x',
  'youtube',
  'linkedin',
] as const;
