import Papa from 'papaparse'
import type {
  NegocioFilaDto,
  TipoContacto,
} from '@/features/negocios/types/api'

const BOM = '﻿'
const TIPOS_RED_SOCIAL: TipoContacto[] = [
  'facebook',
  'instagram',
  'tiktok',
  'x',
  'youtube',
  'linkedin',
]

function unirContactos(negocio: NegocioFilaDto, tipos: TipoContacto[]) {
  return negocio.contactos
    .filter(({ tipo }) => tipos.includes(tipo))
    .map(({ valor }) => valor)
    .join('; ')
}

function crearFila(negocio: NegocioFilaDto) {
  return {
    Negocio: negocio.nombre,
    Dirección: negocio.direccion,
    Ciudad: negocio.ciudad.nombre,
    País: negocio.ciudad.pais.nombre,
    Calificación: negocio.rating,
    Reseñas: negocio.n_resenas,
    '% negativas':
      negocio.pct_negativas === null
        ? null
        : Math.round(negocio.pct_negativas * 100),
    Prioridad: negocio.lead?.prioridad ?? null,
    Tendencia: negocio.lead?.tendencia ?? null,
    Teléfonos: unirContactos(negocio, ['telefono']),
    Correos: unirContactos(negocio, ['email']),
    Web: unirContactos(negocio, ['web']),
    'Redes sociales': unirContactos(negocio, TIPOS_RED_SOCIAL),
    'Google Maps': negocio.url_google_maps,
    'Fecha de extracción': negocio.fecha_extraccion,
  }
}

function nombreDeArchivo(rubro: string) {
  const fecha = new Date().toLocaleDateString('en-CA')
  return `leads-${rubro.trim().replace(/\s+/g, '-')}-${fecha}.csv`
}

export function exportarLeads(leads: NegocioFilaDto[], rubro: string) {
  const csv = Papa.unparse(leads.map(crearFila), {
    delimiter: ',',
    newline: '\r\n',
    escapeFormulae: true,
  })
  const url = URL.createObjectURL(
    new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' }),
  )
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreDeArchivo(rubro)
  enlace.click()
  URL.revokeObjectURL(url)
}
