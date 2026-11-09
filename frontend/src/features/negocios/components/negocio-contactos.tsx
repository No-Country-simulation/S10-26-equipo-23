import type { ContactoDto } from '@/features/negocios/types/api'
import { ContactoValor } from './contacto-valor'
import { SinDato } from './sin-dato'

export function NegocioContactos({ contactos }: { contactos: ContactoDto[] }) {
  if (contactos.length === 0) return <SinDato />

  return (
    <div className="flex w-56 flex-col wrap-anywhere whitespace-normal">
      {contactos.map(({ id, valor }) => (
        <span key={id}>
          <ContactoValor valor={valor} />
        </span>
      ))}
    </div>
  )
}
