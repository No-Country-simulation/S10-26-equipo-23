import type { components, operations } from './api.gen'

type Esquemas = components['schemas']

export type PaisDto = Esquemas['PaisDto']
export type CiudadDto = Esquemas['CiudadDto']
export type CiudadConPaisDto = Esquemas['CiudadConPaisDto']
export type EstadoBusqueda = Esquemas['EstadoBusqueda']
export type UbicacionDto = Esquemas['UbicacionDto']
export type ResultadosDto = Esquemas['ResultadosDto']
export type BusquedaDto = Esquemas['BusquedaDto']
export type ProgresoBusquedaEventoDto = Esquemas['ProgresoBusquedaEventoDto']
export type ProgresoDto = Esquemas['ProgresoDto']

export type CreateCiudadBody =
  operations['CatalogosController_crearCiudad']['requestBody']['content']['application/json']

export type CreateBusquedaBody =
  operations['BusquedasController_crear']['requestBody']['content']['application/json']
