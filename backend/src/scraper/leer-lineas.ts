import type { ChildProcess } from 'node:child_process';

export function leerLineas(
  proceso: ChildProcess,
  alLeer: (linea: string) => void,
) {
  for (const salida of [proceso.stdout, proceso.stderr]) {
    if (!salida) {
      continue;
    }
    let pendiente = '';
    salida.setEncoding('utf8');
    salida.on('data', (fragmento: string) => {
      const lineas = (pendiente + fragmento).split(/\r?\n/);
      pendiente = lineas.pop() ?? '';
      lineas.forEach(alLeer);
    });
    salida.on('end', () => {
      if (pendiente) {
        alLeer(pendiente);
      }
    });
  }
}
