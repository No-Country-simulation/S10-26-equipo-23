import axios, { isAxiosError } from 'axios'
import type { components } from '@/types/api.gen'
import { ApiError } from './api-error'

type ErrorDto = components['schemas']['ErrorDto']

const MENSAJE_SIN_CONEXION =
  'No se pudo conectar con el servidor. Revisa que el backend esté corriendo.'

function esErrorDto(cuerpo: unknown): cuerpo is ErrorDto {
  return (
    typeof cuerpo === 'object' &&
    cuerpo !== null &&
    'code' in cuerpo &&
    'message' in cuerpo
  )
}

export const RUTA_API = '/api'

export const apiClient = axios.create({ baseURL: RUTA_API })

apiClient.interceptors.response.use(undefined, (error: unknown) => {
  if (!isAxiosError(error)) {
    return Promise.reject(error)
  }
  const respuesta = error.response
  if (!respuesta) {
    return Promise.reject(new ApiError(0, 'SIN_CONEXION', MENSAJE_SIN_CONEXION))
  }
  if (esErrorDto(respuesta.data)) {
    const { code, message, fieldErrors } = respuesta.data
    return Promise.reject(
      new ApiError(respuesta.status, code, message, fieldErrors),
    )
  }
  return Promise.reject(
    new ApiError(respuesta.status, 'ERROR_INTERNO', MENSAJE_SIN_CONEXION),
  )
})
