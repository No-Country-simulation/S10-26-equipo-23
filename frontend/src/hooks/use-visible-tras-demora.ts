import { useEffect, useState } from 'react'

const DEMORA_SKELETON_MS = 400

export function useVisibleTrasDemora() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => setVisible(true), DEMORA_SKELETON_MS)
    return () => clearTimeout(temporizador)
  }, [])

  return visible
}
