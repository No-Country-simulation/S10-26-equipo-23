import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  TIPOS_CONTACTO,
  type FuenteContacto,
  type TipoContacto,
} from './dto/contacto.dto.js';
import type { PrioridadLead, TendenciaLead } from './dto/lead.dto.js';

export type Contacto = {
  id: string;
  tipo: TipoContacto;
  subtipo: string | null;
  valor: string;
  fuente: FuenteContacto;
};

type CiudadConPais = {
  id: string;
  nombre: string;
  pais: { id: string; nombre: string };
};

type LeadBase = {
  id: string;
  prioridad: PrioridadLead | null;
  percentil: number | null;
  tendencia: TendenciaLead | null;
  variacion_rating: number | null;
};

type NegocioBase = {
  id: string;
  nombre: string;
  direccion: string | null;
  rating: number | null;
  n_resenas: number | null;
  pct_negativas: number | null;
  url_google_maps: string | null;
  fecha_extraccion: string | null;
  ciudad: CiudadConPais;
  contactos: Contacto[];
};

export type NegocioFila = NegocioBase & {
  lead: (LeadBase & { problema: string | null }) | null;
};

export type Problema = {
  id: string;
  problema: string | null;
  justificacion: string | null;
  generado_en: Date | null;
};

export type Resena = {
  id: string;
  autor: string | null;
  rating: number | null;
  fuente: string | null;
  texto: string | null;
  respondida: boolean | null;
  meses_atras: number | null;
  fecha_aprox: string | null;
  fecha_extraccion: string | null;
};

export type NegocioDetalle = NegocioBase & {
  google_place_id: string;
  hist_5: number | null;
  hist_4: number | null;
  hist_3: number | null;
  hist_2: number | null;
  hist_1: number | null;
  primer_avistamiento: string | null;
  busqueda: { id: string; rubro: string };
  resenas: Resena[];
  lead: (LeadBase & { problemas: Problema[] }) | null;
};

const ORDEN_FUENTE: Record<string, number> = { google_maps: 0, web_negocio: 1 };

const SELECCION_PROBLEMA = {
  id: true,
  problema: true,
  justificacion: true,
  generado_en: true,
} as const satisfies Prisma.NegocioProblemaSelect;

const ORDEN_PROBLEMAS = {
  generado_en: { sort: 'desc', nulls: 'last' },
} as const satisfies Prisma.NegocioProblemaOrderByWithRelationInput;

const SELECCION_BASE = {
  id: true,
  nombre: true,
  direccion: true,
  rating: true,
  n_resenas: true,
  pct_negativas: true,
  url_google_maps: true,
  fecha_extraccion: true,
  ubicacion: {
    select: {
      ciudad: {
        select: {
          id: true,
          nombre: true,
          pais: { select: { id: true, nombre: true } },
        },
      },
    },
  },
  contactos: {
    select: { id: true, tipo: true, subtipo: true, valor: true, fuente: true },
  },
} as const satisfies Prisma.NegocioSelect;

const SELECCION_LEAD = {
  id: true,
  prioridad: true,
  percentil: true,
  tendencia: true,
  variacion_rating: true,
} as const satisfies Prisma.LeadSelect;

const SELECCION_FILA = {
  ...SELECCION_BASE,
  lead: {
    select: {
      ...SELECCION_LEAD,
      problemas: {
        select: { problema: true },
        orderBy: ORDEN_PROBLEMAS,
        take: 1,
      },
    },
  },
} as const satisfies Prisma.NegocioSelect;

const SELECCION_DETALLE = {
  ...SELECCION_BASE,
  google_place_id: true,
  hist_5: true,
  hist_4: true,
  hist_3: true,
  hist_2: true,
  hist_1: true,
  primer_avistamiento: true,
  ubicacion: {
    select: {
      ...SELECCION_BASE.ubicacion.select,
      busqueda: { select: { id: true, rubro: true } },
    },
  },
  resenas: {
    select: {
      id: true,
      autor: true,
      rating: true,
      fuente: true,
      texto: true,
      respondida: true,
      meses_atras: true,
      fecha_aprox: true,
      fecha_extraccion: true,
    },
    orderBy: [{ fecha_aprox: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }],
  },
  lead: {
    select: {
      ...SELECCION_LEAD,
      problemas: { select: SELECCION_PROBLEMA, orderBy: ORDEN_PROBLEMAS },
    },
  },
} as const satisfies Prisma.NegocioSelect;

type FilaBase = Prisma.NegocioGetPayload<{ select: typeof SELECCION_BASE }>;
type FilaLead = Prisma.LeadGetPayload<{ select: typeof SELECCION_LEAD }>;

function aFecha(fecha: Date | null) {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

function aNumero(valor: Prisma.Decimal | null) {
  return valor?.toNumber() ?? null;
}

function ordenarContactos(contactos: FilaBase['contactos']): Contacto[] {
  return (contactos as Contacto[]).toSorted(
    (a, b) =>
      TIPOS_CONTACTO.indexOf(a.tipo) - TIPOS_CONTACTO.indexOf(b.tipo) ||
      (ORDEN_FUENTE[a.fuente] ?? 9) - (ORDEN_FUENTE[b.fuente] ?? 9),
  );
}

function aNegocioBase(fila: FilaBase): NegocioBase {
  return {
    id: fila.id,
    nombre: fila.nombre,
    direccion: fila.direccion,
    rating: aNumero(fila.rating),
    n_resenas: fila.n_resenas,
    pct_negativas: aNumero(fila.pct_negativas),
    url_google_maps: fila.url_google_maps,
    fecha_extraccion: aFecha(fila.fecha_extraccion),
    ciudad: fila.ubicacion.ciudad,
    contactos: ordenarContactos(fila.contactos),
  };
}

function aLeadBase(lead: FilaLead): LeadBase {
  return {
    id: lead.id,
    prioridad: lead.prioridad as PrioridadLead | null,
    percentil: aNumero(lead.percentil),
    tendencia: lead.tendencia as TendenciaLead | null,
    variacion_rating: aNumero(lead.variacion_rating),
  };
}

@Injectable()
export class NegociosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorBusqueda(busquedaId: string): Promise<NegocioFila[]> {
    const filas = await this.prisma.negocio.findMany({
      where: { ubicacion: { busqueda_id: busquedaId } },
      select: SELECCION_FILA,
      orderBy: [{ rating: { sort: 'asc', nulls: 'last' } }, { nombre: 'asc' }],
    });
    return filas.map((fila) => ({
      ...aNegocioBase(fila),
      lead: fila.lead
        ? {
            ...aLeadBase(fila.lead),
            problema: fila.lead.problemas[0]?.problema ?? null,
          }
        : null,
    }));
  }

  async obtener(id: string): Promise<NegocioDetalle | null> {
    const fila = await this.prisma.negocio.findUnique({
      where: { id },
      select: SELECCION_DETALLE,
    });
    if (!fila) {
      return null;
    }
    return {
      ...aNegocioBase(fila),
      google_place_id: fila.google_place_id,
      hist_5: fila.hist_5,
      hist_4: fila.hist_4,
      hist_3: fila.hist_3,
      hist_2: fila.hist_2,
      hist_1: fila.hist_1,
      primer_avistamiento: aFecha(fila.primer_avistamiento),
      busqueda: fila.ubicacion.busqueda,
      resenas: fila.resenas.map((resena) => ({
        ...resena,
        fecha_aprox: aFecha(resena.fecha_aprox),
        fecha_extraccion: aFecha(resena.fecha_extraccion),
      })),
      lead: fila.lead
        ? { ...aLeadBase(fila.lead), problemas: fila.lead.problemas }
        : null,
    };
  }
}
