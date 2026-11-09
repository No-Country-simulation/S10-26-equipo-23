import { toast } from 'sonner'

export const notificar = {
  exito: (mensaje: string) => toast.success(mensaje),
  error: (mensaje: string) => toast.error(mensaje),
}
