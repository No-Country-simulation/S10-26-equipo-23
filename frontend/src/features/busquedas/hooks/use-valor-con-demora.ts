import { useEffect, useState } from 'react'

export function useValorConDemora<T>(valor: T, demoraMs: number) {
  const [valorConDemora, setValorConDemora] = useState(valor)

  useEffect(() => {
    const temporizador = setTimeout(() => setValorConDemora(valor), demoraMs)
    return () => clearTimeout(temporizador)
  }, [valor, demoraMs])

  return valorConDemora
}
