import type { StandardSchemaV1 } from '@standard-schema/spec';
import { ValidacionException } from './validacion.exception.js';

const MENSAJE_CAMPOS = 'Revisa los datos marcados.';

function claveDe(segmento: PropertyKey | StandardSchemaV1.PathSegment) {
  return typeof segmento === 'object' ? segmento.key : segmento;
}

function camposSobrantes(issue: StandardSchemaV1.Issue): string[] | null {
  const posible = issue as StandardSchemaV1.Issue & {
    code?: string;
    keys?: string[];
  };
  return posible.code === 'unrecognized_keys' ? (posible.keys ?? []) : null;
}

export function exceptionFactory(issues: readonly StandardSchemaV1.Issue[]) {
  const fieldErrors: Record<string, string> = {};
  const mensajes: string[] = [];

  for (const issue of issues) {
    const ruta = (issue.path ?? []).map(claveDe).join('.');
    const sobrantes = camposSobrantes(issue);
    if (sobrantes) {
      const prefijo = ruta ? `${ruta}.` : '';
      const nombres = sobrantes.map((clave) => `«${prefijo}${clave}»`);
      mensajes.push(`Campo no permitido: ${nombres.join(', ')}.`);
    } else if (ruta) {
      fieldErrors[ruta] ??= issue.message;
    } else {
      mensajes.push(issue.message);
    }
  }

  const hayCampos = Object.keys(fieldErrors).length > 0;
  const message = mensajes.length > 0 ? mensajes.join(' ') : MENSAJE_CAMPOS;
  return new ValidacionException(message, hayCampos ? fieldErrors : undefined);
}
