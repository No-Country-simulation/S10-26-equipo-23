const ES_URL = /^https?:\/\//i

export function ContactoValor({ valor }: { valor: string }) {
  if (!ES_URL.test(valor)) return valor

  return (
    <a
      href={valor}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4 hover:text-muted-foreground"
    >
      {valor}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  )
}
