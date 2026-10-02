/**
 * Descripción de una gráfica, sin nada de dibujo: la arma cada estudio con su
 * entrada y su resultado, y la pinta el mismo componente en pantalla y en la
 * memoria.
 */

/** Posición en la paleta categórica (1 azul, 2 naranja, 3 verde agua). */
export type ColorSerie = 1 | 2 | 3;

export interface SerieXY {
  nombre: string;
  puntos: [number, number][];
  /** linea; area (línea con relleno al eje); puntos; limite (línea de referencia punteada). */
  estilo: "linea" | "area" | "puntos" | "limite";
  color?: ColorSerie;
  /** No aparece en la leyenda (por ejemplo, el reflejo negativo de un límite). */
  sinLeyenda?: boolean;
}

export interface Eje {
  etiqueta: string;
  min?: number;
  max?: number;
  /** Escala logarítmica (solo eje x). */
  log?: boolean;
  /** Valores crecen hacia abajo (abatimientos, profundidades). */
  invertido?: boolean;
}

/** Punto destacado con su etiqueta, como el punto de diseño. */
export interface Nota {
  x: number;
  y: number;
  texto: string;
  color?: ColorSerie;
}

export interface EspecXY {
  tipo: "xy";
  titulo: string;
  subtitulo?: string;
  x: Eje;
  y: Eje;
  series: SerieXY[];
  notas?: Nota[];
}

export interface EspecBarras {
  tipo: "barras";
  titulo: string;
  subtitulo?: string;
  categorias: string[];
  series: { nombre: string; valores: number[]; color: ColorSerie }[];
  y: Eje;
  /** Línea horizontal de referencia, como el gasto de diseño. */
  referencia?: { valor: number; texto: string };
}

export type EspecGrafica = EspecXY | EspecBarras;
