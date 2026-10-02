/**
 * Tabla de diseño: capacidad de carga admisible qa para varios anchos y
 * profundidades de desplante, con los mismos parámetros del suelo. Sirve para
 * escoger la zapata sin rehacer el estudio. Todo en SI (kPa, m).
 */
import { terzaghiBearingCapacity, type TerzaghiInput } from "./terzaghi";

/** Anchos (o diámetros) usuales de zapatas de casa y edificio pequeño, en m. */
export const ANCHOS_TABLA = [0.6, 0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0] as const;

/** Paso entre profundidades de la tabla y desplante mínimo, en m. */
const PASO_DF = 0.5;
const DF_MINIMO = 0.3;

export interface TablaDiseno {
  anchos: number[];
  /** Profundidades de desplante, de menor a mayor; incluye la capturada. */
  profundidades: number[];
  /** qa en kPa: qa[i][j] para profundidades[i] y anchos[j]; null si no se pudo calcular. */
  qa: (number | null)[][];
}

/**
 * Profundidades de la tabla: la capturada y ±0.5 m. La menor no baja de
 * 0.3 m (si la capturada ya es menor que eso, solo se agrega la mayor).
 */
export function profundidadesTabla(df: number): number[] {
  const r = (x: number) => Math.round(x * 100) / 100;
  const menor = Math.max(DF_MINIMO, df - PASO_DF);
  const lista = [...(menor < df ? [r(menor)] : []), r(df), r(df + PASO_DF)];
  return [...new Set(lista)];
}

export function tablaDiseno(bearing: TerzaghiInput): TablaDiseno {
  const anchos = [...ANCHOS_TABLA];
  const profundidades = profundidadesTabla(bearing.depth);
  const qa = profundidades.map((depth) =>
    anchos.map((width) => {
      try {
        return terzaghiBearingCapacity({ ...bearing, depth, width }).allowable;
      } catch {
        return null;
      }
    }),
  );
  return { anchos, profundidades, qa };
}
