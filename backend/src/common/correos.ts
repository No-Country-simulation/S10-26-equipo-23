export type NegocioParaCorreo = {
  place_id: string;
  nombre: string;
  ciudad: string;
  pais: string;
  descripcion: string;
  n_resenas: number | null;
  rating: number | null;
  problemas: string[];
  email: string | null;
};

export type CorreoGenerado = {
  asunto: string;
  cuerpo: string;
};

export type GenerarCorreos = (
  negocios: NegocioParaCorreo[],
) => Promise<Map<string, CorreoGenerado>>;
