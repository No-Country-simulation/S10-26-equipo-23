export const RATING_NEGATIVA = 2;

export type ResenaParaDetectar = {
  place_id: string;
  texto: string;
  rating: number;
};

export type DetectarProblemas = (
  resenas: ResenaParaDetectar[],
) => Promise<Map<string, string[]>>;
