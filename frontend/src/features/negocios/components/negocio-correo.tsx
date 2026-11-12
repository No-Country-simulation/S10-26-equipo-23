import { Copy, Mail, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRedactarCorreo } from '@/features/negocios/api/redactar-correo'
import type { ContactoDto, CorreoDto } from '@/features/negocios/types/api'
import { notificar } from '@/lib/notificar'
import { DetalleCard } from './detalle-card'

function enlaceDeCorreo(destinatario: string, correo: CorreoDto) {
  const asunto = encodeURIComponent(correo.asunto)
  const cuerpo = encodeURIComponent(correo.cuerpo)
  return `mailto:${destinatario}?subject=${asunto}&body=${cuerpo}`
}

async function copiar(texto: string, mensaje: string) {
  try {
    await navigator.clipboard.writeText(texto)
    notificar.exito(mensaje)
  } catch {
    notificar.error('No se pudo copiar. Selecciona el texto y cópialo a mano.')
  }
}

type NegocioCorreoProps = {
  negocioId: string
  correo: CorreoDto | null
  contactos: ContactoDto[]
}

export function NegocioCorreo({
  negocioId,
  correo,
  contactos,
}: NegocioCorreoProps) {
  const redactar = useRedactarCorreo()
  const destinatario = contactos.find(({ tipo }) => tipo === 'email')?.valor

  return (
    <DetalleCard titulo="Correo de primer contacto">
      <div className="flex flex-col gap-4">
        {correo === null ? (
          <p className="text-muted-foreground">
            Todavía no hay un correo redactado para este lead.
          </p>
        ) : (
          <>
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Asunto</dt>
                <dd className="font-medium wrap-anywhere">{correo.asunto}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">Mensaje</dt>
                <dd className="wrap-anywhere whitespace-pre-wrap">
                  {correo.cuerpo}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void copiar(correo.asunto, 'Asunto copiado')}
              >
                <Copy aria-hidden="true" />
                Copiar asunto
              </Button>
              <Button
                variant="outline"
                onClick={() => void copiar(correo.cuerpo, 'Mensaje copiado')}
              >
                <Copy aria-hidden="true" />
                Copiar mensaje
              </Button>
              {destinatario && (
                <Button asChild>
                  <a href={enlaceDeCorreo(destinatario, correo)}>
                    <Mail aria-hidden="true" />
                    Abrir en mi correo
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
        <div className="flex flex-col gap-2">
          <Button
            variant={correo === null ? 'default' : 'ghost'}
            className="w-fit"
            disabled={redactar.isPending}
            onClick={() => redactar.mutate(negocioId)}
          >
            {correo === null ? (
              <Sparkles aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {redactar.isPending
              ? 'Redactando con Gemini…'
              : correo === null
                ? 'Redactar correo'
                : 'Volver a redactar'}
          </Button>
          <p role="status" className="text-xs text-muted-foreground">
            {redactar.isPending
              ? 'Puede tardar un par de minutos si Gemini está saturado.'
              : correo !== null &&
                'Borrador redactado por Gemini. Revísalo antes de enviarlo.'}
          </p>
        </div>
      </div>
    </DetalleCard>
  )
}
