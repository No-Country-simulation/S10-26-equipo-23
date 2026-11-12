export function formatearProblema(problema: string) {
  return problema.charAt(0).toLocaleUpperCase('es') + problema.slice(1)
}
